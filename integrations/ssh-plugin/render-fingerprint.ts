#!/usr/bin/env node
/**
 * render-fingerprint.ts
 *
 * Reads an SSH fingerprint (or any hash string) from argv[2] and renders
 * it as an inline fractal image using the best available terminal protocol:
 *
 *   iTerm2    → ESC ]1337 inline image protocol
 *   Kitty     → ESC _G Kitty graphics protocol
 *   WezTerm   → Kitty protocol (also supported)
 *   Fallback  → 48-column ANSI block art
 *
 * Compiled to render-fingerprint.js by the install script.
 */

import { fractalHash } from 'fractal-hash';

const fingerprint = process.argv[2];
if (!fingerprint) {
  console.error('Usage: render-fingerprint <fingerprint>');
  process.exit(1);
}

const TERM_PROGRAM = process.env['TERM_PROGRAM'] ?? '';
const TERM         = process.env['TERM'] ?? '';
const COLORTERM    = process.env['COLORTERM'] ?? '';

async function main() {
  if (TERM_PROGRAM === 'iTerm.app') {
    // ── iTerm2 inline image protocol ─────────────────────────────────────
    const dataUrl = await fractalHash(fingerprint, { format: 'png', size: 128 });
    const base64  = dataUrl.split(',')[1] ?? '';
    // ESC ] 1337 ; File=inline=1;width=N;height=N : <base64> BEL
    process.stdout.write(
      `\x1b]1337;File=inline=1;width=24;height=12;preserveAspectRatio=1:${base64}\x07\n`,
    );

  } else if (
    TERM_PROGRAM === 'WezTerm' ||
    TERM.includes('kitty') ||
    COLORTERM === 'truecolor' && process.env['KITTY_WINDOW_ID']
  ) {
    // ── Kitty graphics protocol ───────────────────────────────────────────
    const dataUrl = await fractalHash(fingerprint, { format: 'png', size: 128 });
    const base64  = dataUrl.split(',')[1] ?? '';
    // Split into 4096-byte chunks
    const chunks  = base64.match(/.{1,4096}/g) ?? [];
    chunks.forEach((chunk, i) => {
      const more = i < chunks.length - 1 ? 1 : 0;
      // f=100 = PNG, a=T = transmit+display, m=more
      process.stdout.write(`\x1b_Gf=100,a=T,m=${more};${chunk}\x1b\\`);
    });
    process.stdout.write('\n');

  } else {
    // ── ANSI block art fallback ───────────────────────────────────────────
    const art = await fractalHash(fingerprint, { format: 'ansi' });
    process.stdout.write(art + '\n');
  }
}

main().catch((err) => {
  console.error('fractal-ssh render error:', err.message);
  process.exit(1);
});
