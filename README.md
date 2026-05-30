# Country Days Tracker

A static browser app for tracking stays by country. It uses Vanilla JavaScript, Dexie.js, and IndexedDB for local persistent storage.

## Features

- Track country or territory stays.
- Track start day and optional end date.
- CSV import and export using `country,start_date,end_date,notes` columns.
- PWA manifest and service worker for a browser-installable experience on localhost or HTTPS.

## Run

Serve the folder with any static file server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
