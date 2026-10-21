# Country Days Tracker

A static [browser app](https://aobolensk.github.io/country-days/) for tracking stays by country. It uses Vanilla JavaScript, Dexie.js, and IndexedDB for local persistent storage.

## Features

- Track country or territory stays.
- Track start day and optional end date.
- World map of visited and upcoming countries, with past and planned stay details.
- CSV import and export using `country,start_date,end_date,notes` columns.
- [Google Drive sync](docs/google-drive.md) across devices, with optional automatic sync and conflict resolution.
- PWA manifest and service worker for a browser-installable experience on localhost or HTTPS.

## Run

Serve the folder with any static file server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Tests

```sh
npm ci
npm test
pre-commit run --all-files
```
