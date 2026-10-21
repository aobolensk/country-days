# Google Drive sync

## Site setup

Configure once for the site. Users only sign in with their own Google account.

1. [Create a Cloud project](https://console.cloud.google.com/projectcreate) and enable the [Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com).
2. Configure [Branding](https://console.cloud.google.com/auth/branding) with an app name, support email, and contact email. Select an External [Audience](https://console.cloud.google.com/auth/audience) and add test users. Testing allows only listed users. Publish to allow others.
3. Under [Data Access](https://console.cloud.google.com/auth/scopes), add only `https://www.googleapis.com/auth/drive.appdata`.
4. Under [Clients](https://console.cloud.google.com/auth/clients), create a Web application client with Authorized JavaScript origins `https://aobolensk.github.io`, `http://localhost`, and `http://localhost:8000`. Use origins without paths or trailing slashes. No redirect URI is needed.
5. Save the client ID as the repository Actions secret `GOOGLE_CLIENT_ID`. Deployment injects it into the HTML meta tag. No client secret or API key is needed.

Client IDs are [public identifiers](https://datatracker.ietf.org/doc/html/rfc6749#section-2.2) visible in the deployed page. Restrict authorized origins to the site and local development. Drive access requires user consent.

## Local development

Export `GOOGLE_CLIENT_ID` separately from Actions secrets, then build and serve:

```sh
mkdir -p _site
cp styles.css app.js sync.js google-drive.js service-worker.js manifest.webmanifest _site/
cp -R icons _site/icons
envsubst '$GOOGLE_CLIENT_ID' < index.html > _site/index.html
python3 -m http.server 8000 --directory _site
```

Open `http://localhost:8000`. Sign-in requires the built `_site` directory. Without a configured client ID, sync buttons are hidden.

## Use

Choose **Sign in**, then **Continue with Google** on each device. Sign-in syncs with a [hidden application folder](https://developers.google.com/workspace/drive/api/guides/appdata) in that account. The account button opens **Settings** for manual sync, automatic sync, conflict resolution, and sign-out.

- Automatic sync runs after edits, on return or reconnection, and every minute while visible.
- Reloads remember the account. Tokens stay in memory, so reloads and token expiry require reconnecting in Settings.
- Sign-out stops sync in the current tab and keeps local data. [Revoke access](https://myaccount.google.com/connections) through Google.
- Conflicting edits, deletions, and stale forms require choosing a version. Separate immutable batches preserve concurrent uploads and history, including deleted stays. Matching stays created independently merge when their country, dates, and notes are identical.
- Deleting hidden Drive data does not clear local history. Connected devices can upload it again.

## Data and implementation

Data stays in browser IndexedDB and the selected Drive, without an application backend or analytics. Authenticated responses bypass the service worker cache. Data is not end-to-end encrypted against Google. Each browser database stays linked to its first account. Use a separate browser profile for another account.

`sync.js` manages history, conflicts, account binding, and scheduling. `google-drive.js` handles [Google authorization](https://developers.google.com/identity/oauth2/web/guides/use-token-model) and file access. Registered providers supply identity and connection state, sign-in metadata, and `initialize`, `connect`, `disconnect`, `listFiles`, `readFile`, and `writeFile`.
