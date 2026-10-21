(function () {
  "use strict";

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function recordData(record) {
    return {
      country: record.country,
      startDate: record.startDate,
      endDate: record.endDate || "",
      notes: record.notes || "",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  function wireChange(change) {
    return { id: change.id, stayId: change.stayId, parents: change.parents, record: change.record };
  }

  function makeChange(stayId, parents, record) {
    return { id: crypto.randomUUID(), stayId, parents, record, uploaded: false };
  }

  function heads(changes) {
    const parents = new Set(changes.flatMap((change) => change.parents));
    return changes.filter((change) => !parents.has(change.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  function contentKey(record) {
    return record === null ? "deleted" : JSON.stringify([
      record.country, record.startDate, record.endDate, record.notes
    ]);
  }

  function groupChanges(changes) {
    const groups = new Map();
    for (const change of changes) {
      if (!groups.has(change.stayId)) {
        groups.set(change.stayId, []);
      }
      groups.get(change.stayId).push(change);
    }
    return groups;
  }

  function validDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }

  function parseDocument(document) {
    if (!document || document.format !== "country-days" || document.version !== 1
      || !Array.isArray(document.changes)) {
      throw new Error("Unsupported sync file. Local data has not been replaced.");
    }
    return document.changes.map((change) => {
      if (!change || typeof change.id !== "string" || !UUID.test(change.id)
        || typeof change.stayId !== "string" || !UUID.test(change.stayId)
        || !Array.isArray(change.parents) || change.parents.some((id) => typeof id !== "string" || !UUID.test(id))
        || new Set(change.parents).size !== change.parents.length) {
        throw new Error("Invalid sync history.");
      }
      const record = change.record;
      if (record !== null && (!record || typeof record.country !== "string" || !record.country.trim()
        || !validDate(record.startDate) || (record.endDate !== "" && !validDate(record.endDate))
        || (record.endDate && record.endDate < record.startDate) || typeof record.notes !== "string"
        || typeof record.createdAt !== "string" || !Number.isFinite(Date.parse(record.createdAt))
        || typeof record.updatedAt !== "string" || !Number.isFinite(Date.parse(record.updatedAt)))) {
        throw new Error("Invalid stay in sync data. Local data has not been replaced.");
      }
      return {
        id: change.id, stayId: change.stayId, parents: [...change.parents],
        record: record === null ? null : recordData(record), uploaded: true
      };
    });
  }

  function validateHistory(changes) {
    const byId = new Map(changes.map((change) => [change.id, change]));
    const children = new Map();
    const remaining = new Map();
    const queue = [];
    for (const change of changes) {
      remaining.set(change.id, change.parents.length);
      if (!change.parents.length) {
        queue.push(change.id);
      }
      for (const id of change.parents) {
        if (!byId.has(id) || byId.get(id).stayId !== change.stayId) {
          throw new Error("Incomplete sync history. Try syncing again.");
        }
        if (!children.has(id)) {
          children.set(id, []);
        }
        children.get(id).push(change.id);
      }
    }
    for (let index = 0; index < queue.length; index += 1) {
      for (const id of children.get(queue[index]) || []) {
        remaining.set(id, remaining.get(id) - 1);
        if (remaining.get(id) === 0) {
          queue.push(id);
        }
      }
    }
    if (queue.length !== changes.length) {
      throw new Error("Invalid sync history.");
    }
  }

  class CountryDaysSync {
    static configureDatabase(db, legacyProviderId) {
      db.version(2).stores({
        stays: "++id,&syncId,country,startDate,endDate,createdAt,updatedAt",
        syncChanges: "&id,stayId",
        syncMeta: "&key"
      }).upgrade(async (transaction) => {
        const stays = await transaction.table("stays").toArray();
        for (const stay of stays) {
          const syncId = crypto.randomUUID();
          const change = makeChange(syncId, [], recordData(stay));
          await transaction.table("syncChanges").add(change);
          await transaction.table("stays").update(stay.id, { syncId, revisionIds: [change.id] });
        }
      });
      db.version(3).stores({}).upgrade(async (transaction) => {
        const meta = transaction.table("syncMeta");
        const prefs = await meta.get("preferences");
        if (prefs?.accountId) {
          await meta.put({ ...prefs, providerId: legacyProviderId, signedIn: true });
        }
        for (const row of await meta.toArray()) {
          if (row.key.startsWith("file:") && row.key.split(":").length === 2) {
            await meta.put({ ...row, key: `file:${legacyProviderId}:${row.key.slice(5)}` });
            await meta.delete(row.key);
          }
        }
      });
    }

    constructor(db, options) {
      this.db = db;
      this.options = options;
      this.providers = options.providers;
      this.provider = this.providers[0];
      this.prefs = {};
      this.connecting = false;
      this.syncing = false;
      this.pending = 0;
      this.error = "";
    }

    async initialize() {
      this.prefs = await this.db.syncMeta.get("preferences") || {};
      this.provider = this.providers.find((provider) => provider.id === this.prefs.providerId) || this.provider;
      await this.refresh();
      for (const provider of this.providers) {
        provider.initialize(() => this.emit());
      }
      this.onVisible = () => {
        if (!document.hidden) {
          this.scheduleSync();
        }
      };
      this.pollTimer = setInterval(this.onVisible, 60000);
      document.addEventListener("visibilitychange", this.onVisible);
      window.addEventListener("online", this.onVisible);
    }

    emit() {
      this.options.onStatus({
        configured: this.provider.configured, ready: this.provider.ready,
        connected: this.provider.connected && Boolean(this.prefs.signedIn) && !this.connecting,
        signedIn: Boolean(this.prefs.signedIn),
        connecting: this.connecting, syncing: this.syncing, pending: this.pending,
        linked: Boolean(this.prefs.accountId), email: this.prefs.email || "",
        providerId: this.provider.id, providerName: this.provider.name,
        providers: this.providers.map((provider) => ({
          id: provider.id, name: provider.name, signInLabel: provider.signInLabel,
          configured: provider.configured, ready: provider.ready, error: provider.error
        })),
        automatic: Boolean(this.prefs.automatic), lastSyncedAt: this.prefs.lastSyncedAt || "",
        error: this.error || this.provider.error
      });
    }

    async refresh() {
      this.pending = (await this.db.syncChanges.toArray()).filter((change) => !change.uploaded).length;
      await this.options.onChange();
      this.emit();
    }

    async project(stayIds) {
      for (const syncId of stayIds) {
        const versions = heads(await this.db.syncChanges.where("stayId").equals(syncId).toArray());
        const visible = versions.find((change) => change.record !== null);
        const existing = await this.db.stays.where("syncId").equals(syncId).first();
        if (visible) {
          const stay = {
            ...visible.record, syncId, revisionIds: versions.map((change) => change.id)
          };
          if (existing) {
            await this.db.stays.put({ ...stay, id: existing.id });
          } else {
            await this.db.stays.add(stay);
          }
        } else if (existing) {
          await this.db.stays.delete(existing.id);
        }
      }
    }

    async saveStay(record, existing) {
      const now = new Date().toISOString();
      const syncId = existing?.syncId || crypto.randomUUID();
      const change = makeChange(syncId, existing?.revisionIds || [], recordData({
        ...record, createdAt: existing?.createdAt || now, updatedAt: now
      }));
      await this.db.transaction("rw", this.db.stays, this.db.syncChanges, async () => {
        await this.db.syncChanges.add(change);
        await this.project([syncId]);
      });
      await this.localChanged();
    }

    async deleteStay(stay) {
      await this.db.transaction("rw", this.db.stays, this.db.syncChanges, async () => {
        await this.db.syncChanges.add(makeChange(stay.syncId, stay.revisionIds, null));
        await this.project([stay.syncId]);
      });
      await this.localChanged();
    }

    async importStays(records) {
      await this.db.transaction("rw", this.db.stays, this.db.syncChanges, async () => {
        const ids = [];
        for (const record of records) {
          const syncId = crypto.randomUUID();
          await this.db.syncChanges.add(makeChange(syncId, [], recordData(record)));
          ids.push(syncId);
        }
        await this.project(ids);
      });
      await this.localChanged();
    }

    async localChanged() {
      await this.refresh();
      this.scheduleSync();
    }

    async getConflicts() {
      const conflicts = [];
      for (const [stayId, changes] of groupChanges(await this.db.syncChanges.toArray())) {
        const versions = heads(changes);
        if (new Set(versions.map((change) => contentKey(change.record))).size > 1) {
          conflicts.push({ stayId, versions });
        }
      }
      return conflicts;
    }

    async resolveConflict(conflict, version) {
      await this.db.transaction("rw", this.db.stays, this.db.syncChanges, async () => {
        await this.db.syncChanges.add(makeChange(
          conflict.stayId, conflict.versions.map((change) => change.id), version.record
        ));
        await this.project([conflict.stayId]);
      });
      await this.localChanged();
    }

    async connect(providerId = this.provider.id) {
      if (this.connecting || this.syncing) {
        return false;
      }
      const provider = this.providers.find((entry) => entry.id === providerId);
      if (!provider || !provider.configured) {
        this.error = "This storage service is not configured for this site.";
        this.emit();
        return false;
      }
      if (this.prefs.providerId && this.prefs.providerId !== providerId) {
        this.error = "Local data is linked to another storage service. Use a separate browser profile to switch accounts.";
        this.emit();
        return false;
      }
      this.provider = provider;
      this.error = "";
      if (!provider.ready) {
        await provider.initialize(() => this.emit());
        return false;
      }
      this.connecting = true;
      this.emit();
      try {
        const account = await provider.connect(this.prefs);
        await this.db.transaction("rw", this.db.syncMeta, async () => {
          const prefs = await this.db.syncMeta.get("preferences") || {};
          if (prefs.accountId && (prefs.accountId !== account.id || prefs.providerId !== provider.id)) {
            throw new Error("This browser data is linked to a different account. Sign in with that account or use a separate browser profile.");
          }
          this.prefs = {
            ...prefs, key: "preferences", providerId: provider.id,
            accountId: account.id, email: account.email, signedIn: true
          };
          await this.db.syncMeta.put(this.prefs);
        });
        this.connecting = false;
        await this.sync();
        return true;
      } catch (error) {
        provider.disconnect();
        this.error = error.message;
        return false;
      } finally {
        this.connecting = false;
        this.emit();
      }
    }

    async disconnect() {
      this.provider.disconnect();
      this.error = "";
      clearTimeout(this.saveTimer);
      await this.db.transaction("rw", this.db.syncMeta, async () => {
        this.prefs = {
          ...await this.db.syncMeta.get("preferences"), key: "preferences", signedIn: false, automatic: false
        };
        await this.db.syncMeta.put(this.prefs);
      });
      this.emit();
    }

    async setAutomatic(automatic) {
      if (automatic && !this.prefs.signedIn) {
        throw new Error("Sign in before enabling automatic sync.");
      }
      await this.db.transaction("rw", this.db.syncMeta, async () => {
        this.prefs = { ...await this.db.syncMeta.get("preferences"), key: "preferences", automatic };
        await this.db.syncMeta.put(this.prefs);
      });
      this.emit();
      if (automatic) {
        this.scheduleSync();
      } else {
        clearTimeout(this.saveTimer);
      }
    }

    scheduleSync() {
      if (this.prefs.signedIn && this.prefs.automatic && this.provider.connected && navigator.onLine) {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.sync(), 1000);
      }
    }

    async download() {
      const incoming = [];
      const files = [];
      for (const id of await this.provider.listFiles()) {
        if (await this.db.syncMeta.get(`file:${this.provider.id}:${id}`)) {
          continue;
        }
        incoming.push(...parseDocument(await this.provider.readFile(id)));
        files.push(id);
      }

      await this.db.transaction("rw", this.db.stays, this.db.syncChanges, this.db.syncMeta, async () => {
        const all = new Map((await this.db.syncChanges.toArray()).map((change) => [change.id, change]));
        for (const change of incoming) {
          if (all.has(change.id) && JSON.stringify(wireChange(all.get(change.id))) !== JSON.stringify(wireChange(change))) {
            throw new Error("Conflicting sync history. Local data has not been replaced.");
          }
          all.set(change.id, change);
        }
        validateHistory([...all.values()]);
        await this.db.syncChanges.bulkPut(incoming);
        await this.project(new Set(incoming.map((change) => change.stayId)));
        await this.db.syncMeta.bulkPut(files.map((id) => ({ key: `file:${this.provider.id}:${id}` })));
      });
    }

    async upload() {
      const pending = (await this.db.syncChanges.toArray()).filter((change) => !change.uploaded);
      if (!pending.length) {
        return;
      }
      const id = await this.provider.writeFile({ format: "country-days", version: 1, changes: pending.map(wireChange) });
      if (typeof id !== "string" || !id) {
        throw new Error("The storage service did not confirm the upload. Local changes remain saved.");
      }
      await this.db.transaction("rw", this.db.syncChanges, this.db.syncMeta, async () => {
        await this.db.syncChanges.bulkPut(pending.map((change) => ({ ...change, uploaded: true })));
        await this.db.syncMeta.put({ key: `file:${this.provider.id}:${id}` });
      });
    }

    async sync() {
      if (this.syncing || this.connecting) {
        return;
      }
      if (!this.prefs.signedIn || !this.provider.connected) {
        this.error = "Reconnect your storage account to sync. Local changes remain saved.";
        this.emit();
        return;
      }
      this.syncing = true;
      this.error = "";
      this.emit();
      try {
        await this.download();
        await this.upload();
        await this.db.transaction("rw", this.db.syncMeta, async () => {
          this.prefs = {
            ...await this.db.syncMeta.get("preferences"), key: "preferences",
            lastSyncedAt: new Date().toISOString()
          };
          await this.db.syncMeta.put(this.prefs);
        });
      } catch (error) {
        if (!this.provider.cancelled) {
          this.error = error.name === "TypeError" || error.name === "TimeoutError"
            ? "The storage service is unreachable. Local changes remain saved. Try syncing again."
            : error.message;
        }
      } finally {
        this.syncing = false;
        await this.refresh();
        if (this.pending && !this.error) {
          this.scheduleSync();
        }
      }
    }

    close() {
      for (const provider of this.providers) {
        provider.disconnect();
      }
      clearInterval(this.pollTimer);
      clearTimeout(this.saveTimer);
      document.removeEventListener("visibilitychange", this.onVisible);
      window.removeEventListener("online", this.onVisible);
    }
  }

  window.CountryDaysSync = CountryDaysSync;
})();
