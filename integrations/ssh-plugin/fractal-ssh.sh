#!/usr/bin/env bash
# fractal-ssh — SSH wrapper that renders the host key fingerprint as a fractal.
#
# Drop-in replacement for `ssh`. Shows a fractal visualization of the server's
# fingerprint before you accept it, making MITM attacks visually obvious.
#
# Usage:
#   fractal-ssh user@host [ssh-options...]
#
# Install:
#   ./install.sh          (adds `alias ssh=fractal-ssh` to your shell rc)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENDERER="${SCRIPT_DIR}/render-fingerprint.js"

# Require at least one argument
if [[ $# -eq 0 || "$1" == "--help" || "$1" == "-h" ]]; then
  echo "Usage: fractal-ssh [ssh-options...] [user@]host"
  echo "A drop-in ssh wrapper that visualises the host key fingerprint."
  exit 0
fi

# ── Step 1: probe the server fingerprint without connecting ──────────────────
FINGERPRINT=""
TARGET_HOST=""

# Extract host from args (last positional argument, ignoring -o/-i/-p/-L etc.)
for arg in "$@"; do
  if [[ "$arg" != -* ]]; then
    TARGET_HOST="$arg"
  fi
done

if [[ -n "$TARGET_HOST" ]]; then
  # ssh-keyscan returns lines like: host algo base64-key
  # ssh-keygen -l -f - can compute the fingerprint from that
  KEYSCAN=$(ssh-keyscan -T 3 "${TARGET_HOST##*@}" 2>/dev/null || true)
  if [[ -n "$KEYSCAN" ]]; then
    FINGERPRINT=$(echo "$KEYSCAN" | ssh-keygen -l -f - 2>/dev/null \
      | awk '{print $2}' | head -1 || true)
  fi
fi

# ── Step 2: render the fractal ───────────────────────────────────────────────
if [[ -n "$FINGERPRINT" && -f "$RENDERER" ]]; then
  echo ""
  echo "┌─ Fractal-Hash Fingerprint ─────────────────────────────────────┐"
  node "$RENDERER" "$FINGERPRINT" 2>/dev/null || true
  echo "└────────────────────────────────────────────────────────────────┘"
  echo "  Host: ${TARGET_HOST}   Fingerprint: ${FINGERPRINT}"
  echo ""
fi

# ── Step 3: run the real ssh ─────────────────────────────────────────────────
exec ssh "$@"
