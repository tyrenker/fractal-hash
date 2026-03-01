/**
 * Visual regression test suite.
 *
 * First run: generates snapshot files under test/snapshot/__snapshots__/
 * Subsequent runs: compares byte-for-byte against stored snapshots.
 *
 * To regenerate: delete the snapshot JSON file and run `npm test`.
 * Or set UPDATE_SNAPSHOTS=1 env var: UPDATE_SNAPSHOTS=1 npm test
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { renderToPng } from '../../src/renderers/png-renderer.js';
import { extractParameters } from '../../src/core/parameter-extractor.js';
import { normalize } from '../../src/core/normalizer.js';

const SNAPSHOT_FILE = 'test/snapshot/__snapshots__/visual-snapshots.json';
const UPDATE = process.env['UPDATE_SNAPSHOTS'] === '1';

interface SnapshotStore {
  [name: string]: string; // base64-encoded PNG
}

function loadSnapshots(): SnapshotStore {
  if (existsSync(SNAPSHOT_FILE)) {
    return JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf8')) as SnapshotStore;
  }
  return {};
}

function saveSnapshots(store: SnapshotStore): void {
  const dir = 'test/snapshot/__snapshots__';
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(store, null, 2));
}

const TEST_CASES = [
  { name: 'julia-basic',       input: 'test-julia',                                             size: 64 },
  { name: 'sierpinski-basic',  input: 'test-sierpinski-seed',                                   size: 64 },
  { name: 'lsystem-basic',     input: 'test-lsystem-seed',                                      size: 64 },
  { name: 'dragon-basic',      input: 'test-dragon-seed',                                       size: 64 },
  { name: 'github-key',        input: 'SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8',   size: 64 },
];

describe('Visual regression snapshots', () => {
  const store = loadSnapshots();
  let dirty = false;

  for (const { name, input, size } of TEST_CASES) {
    it(`snapshot: ${name}`, async () => {
      const bytes = await normalize(input);
      const config = extractParameters(bytes);
      const pngBuf = await renderToPng(config, { size });
      const actual = pngBuf.toString('base64');

      if (!store[name] || UPDATE) {
        store[name] = actual;
        dirty = true;
        // First run or update — pass (the snapshot is being established)
        expect(actual.length).toBeGreaterThan(0);
      } else {
        expect(actual).toBe(store[name]);
      }
    });
  }

  // Write snapshots after all tests if any were added/updated
  it('save snapshots (runs last)', () => {
    if (dirty) {
      saveSnapshots(store);
    }
    expect(true).toBe(true);
  });
});
