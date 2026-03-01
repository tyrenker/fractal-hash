# Fractal-Hash for VS Code

Hover over any hash string in your code to instantly see its fractal fingerprint. Makes hashes recognizable — spot accidentally duplicated or mismatched checksums at a glance.

## Features

- **Hash hover tooltips** — hover over any hex hash (MD5, SHA-1, SHA-256, SHA-512) or SSH fingerprint to see a fractal image
- **Render selection command** — select a hash and run **Fractal-Hash: Render Selection** to open a full-size fractal in a side panel
- **Configurable size and theme** — set fractal size (32–512px) and dark/light background

## Detected Formats

| Format | Example |
|--------|---------|
| SHA-256 hex | `a3f8b2c1d4e56789...` (64 chars) |
| SHA-512 hex | (128 chars) |
| SHA-1 hex | (40 chars) |
| MD5 hex | (32 chars) |
| SSH SHA256 | `SHA256:nThbg6kXUpJWGl7E1...` |
| SSH MD5 | `MD5:16:27:ac:a5:...` |

## Install

### From Source

```bash
cd extensions/vscode-extension
npm install
npm run build
# Press F5 in VS Code to launch Extension Development Host
```

### From VSIX

```bash
npm run package       # generates fractal-hash-vscode-1.0.0.vsix
code --install-extension fractal-hash-vscode-1.0.0.vsix
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `fractalHash.size` | `128` | Fractal thumbnail size in pixels |
| `fractalHash.background` | `"dark"` | `"dark"` or `"light"` |
| `fractalHash.enabled` | `true` | Enable/disable hover tooltips |

## Commands

| Command | Description |
|---------|-------------|
| `Fractal-Hash: Render Selection` | Open a full-size fractal for the selected hash |
