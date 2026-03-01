#!/usr/bin/env bash
# Build script for the Fractal-Hash browser extension.
#
# Prerequisites:
#   npm install -D esbuild          (in the repo root, or install globally)
#   npm run build                   (compile TypeScript sources to dist/)
#
# Usage:
#   cd extensions/browser-extension
#   ./build.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "▶ Bundling fractal-hash for browser..."
npx --prefix "${REPO_ROOT}" esbuild \
  "${SCRIPT_DIR}/lib/entry.ts" \
  --bundle \
  --outfile="${SCRIPT_DIR}/lib/fractal-hash.min.js" \
  --format=iife \
  --global-name=FractalHash \
  --platform=browser \
  --minify \
  --sourcemap

echo "▶ Generating extension icons..."
NODE="${REPO_ROOT}/dist/bin/fractal-hash.js"

for SIZE in 16 48 128; do
  node "${NODE}" --size "${SIZE}" \
    --output "${SCRIPT_DIR}/icons/icon-${SIZE}.png" \
    "fractal-hash-extension"
  echo "  icon-${SIZE}.png ✓"
done

echo "✅ Build complete."
echo "   Load extensions/browser-extension/ as an unpacked extension in Chrome:"
echo "   chrome://extensions → Enable developer mode → Load unpacked"
