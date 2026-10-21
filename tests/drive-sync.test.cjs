const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const Dexie = require("dexie");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");

const source = readFileSync(resolve(__dirname, "../sync.js"), "utf8");
const googleSource = readFileSync(resolve(__dirname, "../google-drive.js"), "utf8");
const scope = "https://www.googleapis.com/auth/drive.appdata";
const original = {
  country: "Germany", startDate: "2026-01-01", endDate: "2026-01-10", notes: "First stay"
};

function cloud() {
  const files = new Map();
  const requests = [];
  let failUpload = false;
  let offline = false;
  let loseUploadResponse = false;
  let pageSize = 1000;
  return {
    files, requests,
    set failUpload(value) { failUpload = value; },
    set offline(value) { offline = value; },
    set loseUploadResponse(value) { loseUploadResponse = value; },
    set pageSize(value) { pageSize = value; },
    async fetch(input, options) {
      if (offline) {
        throw new TypeError("Offline");
      }
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      const account = options.headers.Authorization.replace("Bearer ", "");
      requests.push({ url: input, method: options.method || "GET", account, body: options.body });
      const url = new URL(input);
      if (url.pathname.endsWith("/about")) {
        return Response.json({ user: { permissionId: account, emailAddress: `${account}@example.com` } });
      }
      if (options.method === "POST") {
        if (failUpload) {
          return new Response("Unavailable", { status: 503 });
        }
        const boundary = options.headers["Content-Type"].split("boundary=")[1];
        const parts = options.body.split(`--${boundary}`);
        const metadata = JSON.parse(parts[1].split("\r\n\r\n")[1].trim());
        assert.deepEqual(metadata.parents, ["appDataFolder"]);
        const document = JSON.parse(parts[2].split("\r\n\r\n")[1].trim());
        const id = randomUUID();
        files.set(id, { account, document });
        if (loseUploadResponse) {
          loseUploadResponse = false;
          throw new TypeError("Lost response");
        }
        return Response.json({ id });
      }
      if (url.searchParams.get("alt") === "media") {
        const file = files.get(url.pathname.split("/").pop());
        assert.equal(file.account, account);
        return Response.json(file.document);
      }
      assert.equal(url.searchParams.get("spaces"), "appDataFolder");
      const own = [...files].filter(([, file]) => file.account === account);
      const offset = Number(url.searchParams.get("pageToken") || 0);
      return Response.json({
        files: own.slice(offset, offset + pageSize).map(([id]) => ({ id })),
        ...(offset + pageSize < own.length ? { nextPageToken: String(offset + pageSize) } : {})
      });
    }
  };
}

async function device(t, drive, options = {}) {
  const document = new EventTarget();
  document.hidden = false;
  const window = new EventTarget();
  window.google = { accounts: { oauth2: {
    hasGrantedAllScopes: (response, requested) => response.scope === requested,
    initTokenClient: (config) => ({ requestAccessToken: () => {
      window.authorizationRequests = (window.authorizationRequests || 0) + 1;
      window.authorization = config.callback(window.authResponse || options.authResponse || {
        access_token: "account-a", expires_in: 3600, scope
      });
    } })
  } } };
  const context = vm.createContext({
    window, document, navigator: { onLine: true }, crypto: { randomUUID },
    AbortSignal, AbortController, URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval,
    fetch: drive.fetch
  });
  vm.runInContext(source, context);
  vm.runInContext(googleSource, context);
  const db = new Dexie(options.name || randomUUID(), { indexedDB, IDBKeyRange });
  db.version(1).stores({ stays: "++id,country,startDate,endDate,createdAt,updatedAt" });
  window.CountryDaysSync.configureDatabase(db, "google");
  await db.open();
  let status;
  const providers = options.providers || [new window.GoogleDriveProvider({
    clientId: options.clientId === undefined ? "test-client" : options.clientId
  })];
  const sync = new window.CountryDaysSync(db, {
    providers,
    onChange: async () => {}, onStatus: (value) => { status = value; }
  });
  await sync.initialize();
  t.after(async () => {
    sync.close();
    await db.delete();
  });
  return { db, sync, provider: providers[0], window, document, get status() { return status; } };
}

async function authorize(target, account = "account-a") {
  target.window.authResponse = { access_token: account, expires_in: 3600, scope };
  if (!await target.sync.connect()) {
    throw new Error(target.status.error || "Could not sign in");
  }
}

async function synchronize(...devices) {
  for (const target of devices) {
    await target.sync.sync();
    assert.equal(target.status.error, "");
  }
}

test("migration preserves existing stays and CSV imports become sync changes", async (t) => {
  const name = randomUUID();
  const old = new Dexie(name, { indexedDB, IDBKeyRange });
  old.version(1).stores({ stays: "++id,country,startDate,endDate,createdAt,updatedAt" });
  const now = new Date().toISOString();
  const id = await old.stays.add({ ...original, createdAt: now, updatedAt: now });
  old.close();
  const target = await device(t, cloud(), { name, clientId: "" });
  const stay = await target.db.stays.get(id);
  assert.equal(stay.notes, original.notes);
  assert.ok(stay.syncId);
  assert.equal(stay.revisionIds.length, 1);
  assert.equal(await target.db.syncChanges.count(), 1);
  await target.sync.importStays([{ ...original, country: "Japan", createdAt: now, updatedAt: now }]);
  assert.equal(await target.db.stays.count(), 2);
  assert.equal(await target.db.syncChanges.count(), 2);
  assert.equal(target.status.pending, 2);
});

test("an empty phone downloads desktop data without uploading an empty snapshot", async (t) => {
  const drive = cloud();
  const desktop = await device(t, drive);
  const phone = await device(t, drive);
  await desktop.sync.saveStay(original);
  await authorize(desktop);
  await synchronize(desktop);
  await authorize(phone);
  await synchronize(phone);
  assert.equal(drive.files.size, 1);
  assert.equal((await phone.db.stays.toArray())[0].notes, original.notes);
  assert.equal(phone.status.pending, 0);
  const posts = drive.requests.filter((request) => request.method === "POST").length;
  await synchronize(phone, desktop);
  assert.equal(drive.requests.filter((request) => request.method === "POST").length, posts);
});

test("concurrent uploads and local numeric ID collisions keep both stays", async (t) => {
  const drive = cloud();
  const a = await device(t, drive);
  const b = await device(t, drive);
  await authorize(a);
  await authorize(b);
  await a.sync.saveStay(original);
  await b.sync.saveStay({ ...original, country: "Japan" });
  assert.equal((await a.db.stays.toArray())[0].id, (await b.db.stays.toArray())[0].id);
  await Promise.all([a.sync.sync(), b.sync.sync()]);
  await synchronize(a, b);
  assert.equal(await a.db.stays.count(), 2);
  assert.equal(await b.db.stays.count(), 2);
  assert.equal(drive.files.size, 2);
});

test("sequential edits and deletions propagate without restoring deleted stays", async (t) => {
  const drive = cloud();
  const a = await device(t, drive);
  const b = await device(t, drive);
  await authorize(a);
  await authorize(b);
  await a.sync.saveStay(original);
  await synchronize(a, b);
  await b.sync.saveStay({ ...original, notes: "Edited on phone" }, (await b.db.stays.toArray())[0]);
  await synchronize(b, a);
  assert.equal((await a.db.stays.toArray())[0].notes, "Edited on phone");
  await a.sync.deleteStay((await a.db.stays.toArray())[0]);
  await synchronize(a, b, a);
  assert.equal(await a.db.stays.count(), 0);
  assert.equal(await b.db.stays.count(), 0);
});

test("concurrent edits retain both versions until an explicit resolution syncs", async (t) => {
  const drive = cloud();
  const a = await device(t, drive);
  const b = await device(t, drive);
  await authorize(a);
  await authorize(b);
  await a.sync.saveStay(original);
  await synchronize(a, b);
  await a.sync.saveStay({ ...original, notes: "Desktop edit" }, (await a.db.stays.toArray())[0]);
  await b.sync.saveStay({ ...original, notes: "Phone edit" }, (await b.db.stays.toArray())[0]);
  await synchronize(a, b, a);
  const [conflict] = await a.sync.getConflicts();
  assert.equal(conflict.versions.length, 2);
  assert.deepEqual(new Set(conflict.versions.map((version) => version.record.notes)), new Set(["Desktop edit", "Phone edit"]));
  await a.sync.resolveConflict(conflict, conflict.versions.find((version) => version.record.notes === "Phone edit"));
  await synchronize(a, b);
  assert.equal((await b.sync.getConflicts()).length, 0);
  assert.equal((await b.db.stays.toArray())[0].notes, "Phone edit");
});

test("concurrent deletion and editing require a choice instead of losing the edit", async (t) => {
  const drive = cloud();
  const a = await device(t, drive);
  const b = await device(t, drive);
  await authorize(a);
  await authorize(b);
  await a.sync.saveStay(original);
  await synchronize(a, b);
  await a.sync.deleteStay((await a.db.stays.toArray())[0]);
  await b.sync.saveStay({ ...original, notes: "Offline edit" }, (await b.db.stays.toArray())[0]);
  await synchronize(a, b, a);
  assert.equal(await a.db.stays.count(), 1);
  const [conflict] = await a.sync.getConflicts();
  assert.equal(conflict.versions.length, 2);
  await a.sync.resolveConflict(conflict, conflict.versions.find((version) => version.record === null));
  await synchronize(a, b);
  assert.equal(await b.db.stays.count(), 0);
  assert.equal((await b.sync.getConflicts()).length, 0);
});

test("saving a stale form produces a conflict with the downloaded edit", async (t) => {
  const drive = cloud();
  const a = await device(t, drive);
  const b = await device(t, drive);
  await authorize(a);
  await authorize(b);
  await a.sync.saveStay(original);
  await synchronize(a, b);
  const draft = (await b.db.stays.toArray())[0];
  await a.sync.saveStay({ ...original, notes: "Remote edit" }, (await a.db.stays.toArray())[0]);
  await synchronize(a, b);
  await b.sync.saveStay({ ...original, notes: "Stale form edit" }, draft);
  assert.equal((await b.sync.getConflicts())[0].versions.length, 2);
});

test("offline and failed uploads keep changes pending for retry", async (t) => {
  const drive = cloud();
  const target = await device(t, drive);
  await authorize(target);
  await target.sync.saveStay(original);
  drive.offline = true;
  await target.sync.sync();
  assert.match(target.status.error, /unreachable/);
  assert.equal(target.status.pending, 1);
  drive.offline = false;
  drive.failUpload = true;
  await target.sync.sync();
  assert.match(target.status.error, /503/);
  assert.equal(target.status.pending, 1);
  assert.equal(await target.db.stays.count(), 1);
  drive.failUpload = false;
  await synchronize(target);
  assert.equal(target.status.pending, 0);
});

test("a lost upload response is safely reconciled without duplicate stays", async (t) => {
  const drive = cloud();
  const target = await device(t, drive);
  await authorize(target);
  await target.sync.saveStay(original);
  drive.loseUploadResponse = true;
  await target.sync.sync();
  assert.equal(target.status.pending, 1);
  assert.equal(drive.files.size, 1);
  await synchronize(target);
  assert.equal(target.status.pending, 0);
  assert.equal(await target.db.stays.count(), 1);
  assert.equal(drive.files.size, 1);
});

test("a wrong Google account is rejected before any data upload", async (t) => {
  const drive = cloud();
  const target = await device(t, drive);
  await authorize(target);
  await target.sync.saveStay(original);
  await target.sync.disconnect();
  await assert.rejects(authorize(target, "account-b"), /different account/);
  await target.sync.sync();
  assert.match(target.status.error, /Reconnect/);
  assert.equal(drive.requests.filter((request) => request.method === "POST").length, 0);
  assert.equal(await target.db.stays.count(), 1);
});

test("reload keeps local pending data and preferences, but does not persist a token", async (t) => {
  const drive = cloud();
  const a = await device(t, drive);
  await authorize(a);
  await a.sync.saveStay(original);
  await a.sync.setAutomatic(true);
  const b = await device(t, drive, { name: a.db.name });
  assert.equal(b.status.connected, false);
  assert.equal(b.status.signedIn, true);
  assert.equal(b.status.email, "account-a@example.com");
  assert.equal(b.status.automatic, true);
  assert.equal(b.status.pending, 1);
  assert.equal(JSON.stringify(await b.db.syncMeta.toArray()).includes("access_token"), false);
  await b.sync.sync();
  assert.match(b.status.error, /Reconnect/);
  assert.equal(drive.files.size, 0);
});

test("paginated history is downloaded and invalid files cannot replace local data", async (t) => {
  const drive = cloud();
  drive.pageSize = 1;
  const a = await device(t, drive);
  await authorize(a);
  await a.sync.saveStay(original);
  await synchronize(a);
  await a.sync.saveStay({ ...original, notes: "Second version" }, (await a.db.stays.toArray())[0]);
  await synchronize(a);
  const b = await device(t, drive);
  await authorize(b);
  await synchronize(b);
  assert.equal((await b.db.stays.toArray())[0].notes, "Second version");
  drive.files.set(randomUUID(), { account: "account-a", document: { format: "country-days", version: 99, changes: [] } });
  await b.sync.saveStay({ ...original, notes: "Unsynced local edit" }, (await b.db.stays.toArray())[0]);
  await b.sync.sync();
  assert.match(b.status.error, /Unsupported/);
  assert.equal(b.status.pending, 1);
  assert.equal((await b.db.stays.toArray())[0].notes, "Unsynced local edit");
});

test("cyclic history is rejected atomically", async (t) => {
  const drive = cloud();
  const target = await device(t, drive);
  await authorize(target);
  await target.sync.saveStay(original);
  const id = randomUUID();
  drive.files.set(randomUUID(), { account: "account-a", document: {
    format: "country-days", version: 1,
    changes: [{ id, stayId: randomUUID(), parents: [id], record: null }]
  } });
  await target.sync.sync();
  assert.match(target.status.error, /Invalid/);
  assert.equal(await target.db.stays.count(), 1);
  assert.equal(await target.db.syncChanges.count(), 1);
});

test("Google consent denial keeps data local, successful consent triggers sync", async (t) => {
  const drive = cloud();
  const denied = await device(t, drive, { authResponse: { error: "access_denied" } });
  await denied.sync.saveStay(original);
  await denied.sync.connect();
  assert.match(denied.status.error, /not granted/);
  assert.equal(drive.requests.length, 0);
  const accepted = await device(t, drive);
  await accepted.sync.saveStay(original);
  await accepted.sync.connect();
  assert.equal(accepted.status.connected, true);
  assert.equal(accepted.status.pending, 0);
});

test("automatic sync runs after edits without requesting fresh authorization", async (t) => {
  const drive = cloud();
  const target = await device(t, drive);
  await authorize(target);
  await target.sync.setAutomatic(true);
  await target.sync.saveStay(original);
  await new Promise((done) => setTimeout(done, 1200));
  assert.equal(target.status.pending, 0);
  assert.equal(drive.files.size, 1);
  target.provider.expiresAt = Date.now() - 1;
  await target.sync.saveStay({ ...original, notes: "Token expired" }, (await target.db.stays.toArray())[0]);
  await new Promise((done) => setTimeout(done, 1200));
  assert.equal(target.status.pending, 1);
  assert.equal(target.window.authorizationRequests, 1);
});

test("the service worker never caches authenticated or Google sync requests", () => {
  const handlers = {};
  vm.runInNewContext(readFileSync(resolve(__dirname, "../service-worker.js"), "utf8"), {
    self: { addEventListener: (name, handler) => { handlers[name] = handler; } }, URL
  });
  for (const request of [
    new Request("https://www.googleapis.com/drive/v3/files"),
    new Request("https://accounts.google.com/gsi/client"),
    new Request("https://example.com/private", { headers: { Authorization: "Bearer sensitive" } }),
    new Request("https://example.com/private", { cache: "no-store" }),
    new Request("https://www.googleapis.com/upload/drive/v3/files", { method: "POST" })
  ]) {
    handlers.fetch({ request, respondWith: () => assert.fail("Sensitive request reached the offline cache") });
  }
});

test("service worker updates remove old caches and keep the active application cache", async () => {
  const handlers = {};
  const deleted = [];
  let claimed = false;
  vm.runInNewContext(readFileSync(resolve(__dirname, "../service-worker.js"), "utf8"), {
    self: {
      addEventListener: (name, handler) => { handlers[name] = handler; },
      clients: { claim: async () => { claimed = true; } }
    },
    caches: {
      keys: async () => ["country-days", "country-days-v1", "country-days-v2", "country-days-v3", "country-days-v4", "other-app"],
      delete: async (key) => { deleted.push(key); }
    }
  });
  let done;
  handlers.activate({ waitUntil: (promise) => { done = promise; } });
  await done;
  assert.deepEqual(deleted.sort(), ["country-days-v1", "country-days-v2", "country-days-v3", "country-days-v4"]);
  assert.equal(claimed, true);
});

function memoryProvider(files, id = "memory") {
  return {
    id, name: "Test storage", signInLabel: "Continue with test storage",
    configured: true, ready: true, connected: false, cancelled: false, error: "", connections: 0,
    initialize() {},
    async connect() {
      this.connections += 1;
      this.connected = true;
      this.cancelled = false;
      return { id: "account-a", email: "account-a@example.com" };
    },
    disconnect() { this.connected = false; this.cancelled = true; },
    async listFiles() { return [...files.keys()]; },
    async readFile(key) { return structuredClone(files.get(key)); },
    async writeFile(document) {
      const key = randomUUID();
      files.set(key, structuredClone(document));
      return key;
    }
  };
}

test("the sync engine works with a provider that has no Google API or token handling", async (t) => {
  const drive = cloud();
  const files = new Map();
  const a = await device(t, drive, { providers: [memoryProvider(files)] });
  const b = await device(t, drive, { providers: [memoryProvider(files)] });
  await a.sync.saveStay(original);
  assert.equal(await a.sync.connect("memory"), true);
  assert.equal(await b.sync.connect("memory"), true);
  assert.equal((await b.db.stays.toArray())[0].notes, original.notes);
  assert.equal(b.status.providerId, "memory");
  assert.equal(b.status.signedIn, true);
  assert.equal(drive.requests.length, 0);
  assert.equal(a.window.authorizationRequests || 0, 0);
  assert.equal(b.window.authorizationRequests || 0, 0);
});

test("signing out persists without deleting stays or account binding", async (t) => {
  const drive = cloud();
  const a = await device(t, drive);
  await authorize(a);
  await a.sync.saveStay(original);
  await a.sync.setAutomatic(true);
  await a.sync.disconnect();
  const b = await device(t, drive, { name: a.db.name });
  assert.equal(b.status.signedIn, false);
  assert.equal(b.status.automatic, false);
  assert.equal(b.status.connected, false);
  assert.equal(b.status.linked, true);
  assert.equal(await b.db.stays.count(), 1);
  await assert.rejects(b.sync.setAutomatic(true), /Sign in/);
});

test("changing provider cannot upload an existing account to a different service", async (t) => {
  const files = new Map();
  const otherFiles = new Map();
  const first = memoryProvider(files);
  const other = memoryProvider(otherFiles, "other");
  const target = await device(t, cloud(), { providers: [first, other] });
  await target.sync.saveStay(original);
  assert.equal(await target.sync.connect("memory"), true);
  await target.sync.disconnect();
  assert.equal(await target.sync.connect("other"), false);
  assert.match(target.status.error, /another storage service/);
  assert.equal(other.connections, 0);
  assert.equal(otherFiles.size, 0);
});

test("the previous Google sync database upgrades its account and file markers", async (t) => {
  const name = randomUUID();
  const old = new Dexie(name, { indexedDB, IDBKeyRange });
  old.version(2).stores({
    stays: "++id,&syncId,country,startDate,endDate,createdAt,updatedAt",
    syncChanges: "&id,stayId", syncMeta: "&key"
  });
  await old.open();
  await old.syncMeta.put({
    key: "preferences", accountId: "account-a", email: "account-a@example.com", automatic: true
  });
  await old.syncMeta.put({ key: "file:old-file" });
  old.close();
  const target = await device(t, cloud(), { name });
  assert.equal(target.status.signedIn, true);
  assert.equal(target.status.connected, false);
  assert.equal(target.status.providerId, "google");
  assert.equal(target.status.email, "account-a@example.com");
  assert.equal(target.status.automatic, true);
  assert.ok(await target.db.syncMeta.get("file:google:old-file"));
  assert.equal(await target.db.syncMeta.get("file:old-file"), undefined);
});
