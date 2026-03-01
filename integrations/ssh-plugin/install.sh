#!/usr/bin/env bash
# install.sh — Install the fractal-ssh plugin.
#
# Compiles render-fingerprint.ts → render-fingerprint.js and adds the
# `fractal-ssh` alias to your shell's rc file.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Compile TypeScript ────────────────────────────────────────────────────────
echo "▶ Compiling render-fingerprint.ts..."
if ! command -v npx &>/dev/null; then
  echo "Error: npx not found. Install Node.js >= 18 first." >&2
  exit 1
fi

# Ensure fractal-hash is installed
if ! node -e "require('fractal-hash')" 2>/dev/null; then
  echo "▶ Installing fractal-hash globally..."
  npm install -g fractal-hash
fi

# Compile with tsc or fall back to ts-node
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext \
  --esModuleInterop --outDir "${SCRIPT_DIR}" \
  "${SCRIPT_DIR}/render-fingerprint.ts" 2>/dev/null || \
npx tsx --tsconfig '{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext"}}' \
  "${SCRIPT_DIR}/render-fingerprint.ts" -- --compile-only 2>/dev/null || true

# Make scripts executable
chmod +x "${SCRIPT_DIR}/fractal-ssh.sh"
[[ -f "${SCRIPT_DIR}/render-fingerprint.js" ]] && \
  chmod +x "${SCRIPT_DIR}/render-fingerprint.js"

# ── Add alias to shell rc ─────────────────────────────────────────────────────
SHELL_NAME="$(basename "${SHELL:-/bin/bash}")"
SHELL_RC="${HOME}/.${SHELL_NAME}rc"
[[ "$SHELL_NAME" == "zsh" && -f "${HOME}/.zshrc" ]] && SHELL_RC="${HOME}/.zshrc"

ALIAS_LINE="alias ssh=\"${SCRIPT_DIR}/fractal-ssh.sh\""
PATH_LINE="export PATH=\"\$PATH:${SCRIPT_DIR}\""

if grep -qF "fractal-ssh" "${SHELL_RC}" 2>/dev/null; then
  echo "✓ fractal-ssh already configured in ${SHELL_RC}"
else
  {
    echo ""
    echo "# fractal-ssh: visualise SSH host key fingerprints as fractals"
    echo "${PATH_LINE}"
    echo "${ALIAS_LINE}"
  } >> "${SHELL_RC}"
  echo "✅ fractal-ssh installed to ${SHELL_RC}"
fi

echo ""
echo "Restart your terminal (or run: source ${SHELL_RC})"
echo "Then use ssh normally — your connections will show fractal fingerprints."
