# fractal-ssh — SSH Fingerprint Visualizer

A drop-in `ssh` wrapper that renders the server's host-key fingerprint as a fractal image before you accept the connection. MITM attacks that swap certificates change the fractal — making them visually obvious.

```
┌─ Fractal-Hash Fingerprint ─────────────────────────────────────┐
  (fractal art rendered here)
└────────────────────────────────────────────────────────────────┘
  Host: github.com   Fingerprint: SHA256:nThbg6kXUpJWGl7E1IGOCspR…
```

## Install

```bash
cd integrations/ssh-plugin
./install.sh
```

This compiles `render-fingerprint.ts` and adds `alias ssh="fractal-ssh"` to your shell rc file.

**Prerequisites:** Node.js ≥ 18, `fractal-hash` npm package installed globally or locally.

## Terminal Support

| Terminal | Protocol | Quality |
|----------|---------|---------|
| iTerm2 | ESC ]1337 inline image | Full PNG |
| Kitty | ESC _G graphics protocol | Full PNG |
| WezTerm | Kitty protocol | Full PNG |
| Any 24-bit | ANSI block art (▀) | 48 cols |

## Manual Usage

```bash
# Render a fingerprint directly
node render-fingerprint.js "SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8"

# Use the wrapper
./fractal-ssh.sh user@github.com
```

## Security Note

The fractal is derived from the **hostname** by default (via `ssh-keyscan`). For maximum security, verify the displayed fingerprint matches the server's published fingerprint out-of-band (e.g., from your cloud provider's console). The fractal makes fingerprints _memorable and recognizable_ — it doesn't replace verification.
