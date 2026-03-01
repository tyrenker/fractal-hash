# Fractal-Hash: Browser Extension

Displays a deterministic fractal fingerprint for the current page's hostname in the browser toolbar. Certificate changes (potential MITM) visibly alter the fractal.

## Build

From the **repo root**, ensure the library is compiled:

```bash
npm run build
```

Then from this directory:

```bash
# Install esbuild (one-time, dev only)
npm install -D esbuild   # or: npm install -g esbuild

./build.sh
```

`build.sh` will:
1. Bundle `lib/entry.ts` → `lib/fractal-hash.min.js` (browser-safe IIFE)
2. Generate `icons/icon-{16,48,128}.png` using the CLI

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this directory (`extensions/browser-extension/`)

## Load in Firefox

```bash
# Requires web-ext
npx web-ext run --source-dir .
```

## How It Works

- The popup queries the current tab's URL and extracts the hostname.
- That hostname is passed to `fractalHash()` which deterministically renders a unique fractal.
- In production, replace the hostname with the actual TLS certificate SHA-256 fingerprint extracted via `chrome.certificateProvider` or `chrome.webRequest` security details.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome/Firefox WebExtension MV3 manifest |
| `background.js` | Service worker — tracks tab hostnames |
| `popup/popup.html` | Extension popup UI |
| `popup/popup.css` | Popup styles (dark theme) |
| `popup/popup.js` | Popup logic — renders fractal for current tab |
| `lib/entry.ts` | Browser-safe entry point (no node:zlib) |
| `lib/fractal-hash.min.js` | **Generated** — bundled library |
| `icons/icon-*.png` | **Generated** — extension icons |
| `build.sh` | Build script (esbuild + icon generation) |
