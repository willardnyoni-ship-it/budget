# Budget

A private, offline-first budget tracker. Receipt scanning and bank-statement parsing
both run in the browser and are never uploaded. An account is optional — it only
exists to sync your (end-to-end encrypted) data across your own devices.

## Put it on GitHub Pages

1. Go to **github.com/new**. Name it `budget`, set it to **Public**, click *Create repository*.
   (GitHub Pages only works from public repos on the free plan.)
2. Click **uploading an existing file**, drag in *everything in this folder*:
   `index.html`, `landing.html`, `manifest.json`, `sw.js`, and all six `icon-*.png` files.
   Do **not** upload `budget-setup-PRIVATE.json` — it lives on your phone only.
3. Click **Commit changes**.
4. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → **Save**.
5. Wait about a minute. Your URL is `https://YOURNAME.github.io/budget/`.

## Install on iPhone

1. Open the URL in **Safari**. It must be Safari — Chrome on iOS cannot install web apps.
2. Tap the **Share** button (square with an arrow).
3. Scroll down, tap **Add to Home Screen**, then **Add**.
4. Launch it from the home screen. It opens full-screen with no browser bars.

## Install on Android

Open the URL in Chrome. You should get an *Install app* prompt; if not,
use ⋮ → **Add to Home screen**.

## First run

1. Open **Budget** (bottom bar) → **Restore from backup** → pick `budget-setup-PRIVATE.json`.
   That loads your income, pay day, category targets, shortcut buttons and merchant rules.
2. Go to **Import** and drop in your FNB statement PDFs to build up history.
3. Do your first **Snap** while on wifi — it downloads the OCR engine once (~4 MB),
   then caches it for offline use.

## Day to day

| Tab | What it's for |
|---|---|
| **Today** | Safe-to-spend, budget burn-down, category bars, over-budget and duplicate-charge alerts |
| **Snap** | Photograph a till slip; OCR pre-fills the amount, you confirm. Also quick-log chips and manual entry |
| **Import** | Drop the monthly FNB statement PDF |
| **Match** | Reconcile slips against the statement. Shows your capture rate and your blind spots |
| **Budget** | Income, pay day, category targets, backup and restore |
| **Trends** | Month-on-month spending |

## Backups matter

Your data lives only in this browser on this phone. There is no cloud copy.
**Budget → Export backup (JSON)** every week or two, and mail it to yourself.
Clearing Safari website data, or losing the phone, loses the lot.

Photos are stored separately in IndexedDB and are *not* in the JSON backup.
Use **Export transactions (CSV)** if you want the numbers in a spreadsheet.

## Updating

Re-upload the changed files to GitHub. The service worker caches aggressively, so
bump `VERSION` at the top of `sw.js` (e.g. `v3` → `v4`) whenever you change
`index.html`, otherwise phones may keep serving the old build.

## Notes and limits

- **OCR is a helper, not an oracle.** On a creased or dim slip it will get the total
  wrong. Nothing saves without your confirmation — check the number before tapping save.
- **Reconciliation** matches on exact amount within ±4 days. Same-amount purchases close
  together may pair with the wrong slip; the Match tab shows you every pairing.
- **Statement parsing** is built for FNB's layout and was verified to the cent against
  four consecutive statements. Other banks will need the parser adjusted.
- The hosted files contain **no personal information** — your figures arrive only when
  you restore your private setup file on the device.
