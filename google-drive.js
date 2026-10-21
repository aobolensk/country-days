(function () {
  "use strict";

  const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
  const API = "https://www.googleapis.com/drive/v3/";
  const FILE_NAME = "country-days-changes-v1.json";
  let identityPromise;

  class GoogleDriveProvider {
    constructor(options) {
      this.id = "google";
      this.name = "Google Drive";
      this.signInLabel = "Continue with Google";
      this.clientId = options.clientId;
      this.ready = false;
      this.token = "";
      this.expiresAt = 0;
      this.error = "";
      this.onStatus = () => {};
      this.controller = new AbortController();
    }

    get configured() {
      return Boolean(this.clientId);
    }

    get connected() {
      return Boolean(this.token) && Date.now() < this.expiresAt;
    }

    get cancelled() {
      return this.controller.signal.aborted;
    }

    async initialize(onStatus) {
      this.onStatus = onStatus;
      if (!this.configured) {
        return;
      }
      this.error = "";
      if (!identityPromise) {
        identityPromise = new Promise((resolve, reject) => {
          if (window.google?.accounts?.oauth2) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          const fail = () => {
            clearTimeout(timer);
            script.remove();
            reject(new Error("Google sign-in could not load. Check your connection and retry."));
          };
          const timer = setTimeout(fail, 15000);
          script.onload = () => { clearTimeout(timer); resolve(); };
          script.onerror = fail;
          document.head.append(script);
        }).catch((error) => {
          identityPromise = null;
          throw error;
        });
      }
      try {
        await identityPromise;
        this.ready = true;
      } catch (error) {
        this.error = error.message;
      }
      this.onStatus();
    }

    connect(hint) {
      this.error = "";
      return new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId, scope: SCOPE, include_granted_scopes: false,
          callback: async (response) => {
            if (response.error || !response.access_token
              || !window.google.accounts.oauth2.hasGrantedAllScopes(response, SCOPE)) {
              reject(new Error("Google Drive access was not granted. Your data remains saved on this device."));
              return;
            }
            try {
              this.controller = new AbortController();
              this.token = response.access_token;
              this.expiresAt = Date.now() + Number(response.expires_in) * 1000;
              if (!Number.isFinite(this.expiresAt) || this.expiresAt <= Date.now()) {
                throw new Error("Google sign-in expired. Try again.");
              }
              const about = await this.request(`${API}about?fields=user(permissionId,emailAddress)`);
              if (!about.user?.permissionId || !about.user.emailAddress) {
                throw new Error("Could not identify the Google Drive account.");
              }
              clearTimeout(this.expiryTimer);
              this.expiryTimer = setTimeout(() => {
                this.token = "";
                this.onStatus();
              }, Math.max(0, this.expiresAt - Date.now()));
              resolve({ id: about.user.permissionId, email: about.user.emailAddress });
            } catch (error) {
              this.disconnect();
              reject(error);
            }
          },
          error_callback: () => reject(new Error("Google sign-in was closed or blocked. Try again."))
        });
        client.requestAccessToken({
          prompt: hint.accountId ? "" : "select_account", login_hint: hint.email || ""
        });
      });
    }

    disconnect() {
      this.controller.abort();
      this.token = "";
      clearTimeout(this.expiryTimer);
      this.onStatus();
    }

    async request(url, options = {}) {
      if (!this.connected) {
        this.token = "";
        throw new Error("Reconnect Google Drive to sync. Local changes remain saved.");
      }
      const response = await fetch(url, {
        ...options, cache: "no-store", redirect: "error",
        signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(30000)]),
        headers: { ...options.headers, Authorization: `Bearer ${this.token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          this.token = "";
          throw new Error("Reconnect Google Drive to sync. Local changes remain saved.");
        }
        throw new Error(`Google Drive could not sync (${response.status}). Local changes remain saved. Try again when Drive access is available.`);
      }
      return response.json();
    }

    async listFiles() {
      let pageToken = "";
      const files = [];
      do {
        const params = new URLSearchParams({
          spaces: "appDataFolder", q: `name = '${FILE_NAME}'`,
          fields: "nextPageToken,files(id)", pageSize: "1000"
        });
        if (pageToken) {
          params.set("pageToken", pageToken);
        }
        const page = await this.request(`${API}files?${params}`);
        if (!Array.isArray(page.files)) {
          throw new Error("Google Drive returned an invalid file list.");
        }
        files.push(...page.files.map((file) => file.id));
        pageToken = page.nextPageToken || "";
      } while (pageToken);
      return files;
    }

    async readFile(id) {
      return this.request(`${API}files/${encodeURIComponent(id)}?alt=media`);
    }

    async writeFile(document) {
      const boundary = `country_days_${crypto.randomUUID()}`;
      const body = [
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
        JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] }),
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
        JSON.stringify(document),
        `\r\n--${boundary}--`
      ].join("");
      const file = await this.request("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body
      });
      return file.id;
    }
  }

  window.GoogleDriveProvider = GoogleDriveProvider;
})();
