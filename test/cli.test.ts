/**
 * CLI integration tests.
 * These tests require a compiled build (`npm run build`).
 * They are skipped automatically if dist/bin/fractal-hash.js does not exist.
 *
 * Run `npm run build && npm test` to include these tests.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI_PATH = resolve(__dirname, '../dist/bin/fractal-hash.js');
const HAS_BUILD = existsSync(CLI_PATH);

function cli(args: string[], input?: string) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    input,
    timeout: 15_000,
  });
}

describe.skipIf(!HAS_BUILD)('CLI integration (requires npm run build)', () => {
  it('--help exits 0 and prints usage', () => {
    const result = cli(['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('--format');
  });

  it('positional argument produces ANSI output with escape codes', () => {
    const result = cli(['test-hash']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('\x1b[');
    expect(result.stdout).toContain('▀');
  });

  it('--format png produces valid PNG bytes', () => {
    const result = spawnSync(process.execPath, [CLI_PATH, '--format', 'png', '--size', '32', 'test'], {
      timeout: 15_000,
      encoding: 'buffer',
    });
    expect(result.status).toBe(0);
    expect(result.stdout[0]).toBe(137); // PNG signature
    expect(result.stdout[1]).toBe(80);  // P
    expect(result.stdout[2]).toBe(78);  // N
    expect(result.stdout[3]).toBe(71);  // G
  });

  it('--format svg produces SVG output', () => {
    const result = cli(['--format', 'svg', '--size', '64', 'test']);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^<svg/);
    expect(result.stdout).toContain('viewBox');
  });

  it('--stdin reads hash from stdin pipe', () => {
    const result = cli(['--stdin'], 'hello-world');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('\x1b[');
  });

  it('missing input exits 1 with error message', () => {
    const result = cli([]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Error:');
  });

  it('different inputs produce different ANSI output', () => {
    const r1 = cli(['input-alpha']);
    const r2 = cli(['input-beta']);
    expect(r1.stdout).not.toBe(r2.stdout);
  });

  it('same input produces identical ANSI output (determinism)', () => {
    const r1 = cli(['determinism-test']);
    const r2 = cli(['determinism-test']);
    expect(r1.stdout).toBe(r2.stdout);
  });
});
