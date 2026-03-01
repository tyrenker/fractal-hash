/**
 * examples/ssh-fingerprint.ts
 *
 * Demonstrates Node.js usage: render an SSH fingerprint to a PNG file.
 *
 * Usage (requires `npm run build` first):
 *   node --input-type=module < examples/ssh-fingerprint.ts
 *   # or with tsx:
 *   npx tsx examples/ssh-fingerprint.ts
 */

import { fractalHash } from '../dist/index.js';
import { writeFileSync } from 'node:fs';

const fingerprints: Array<{ label: string; fp: string }> = [
  { label: 'github',    fp: 'SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8' },
  { label: 'gitlab',    fp: 'SHA256:ROQFvPThGrW4RuWLoL9tq9I9zJ42fK4XywyRtbOz/EQ' },
  { label: 'hello',     fp: 'hello-world' },
];

for (const { label, fp } of fingerprints) {
  const dataUrl = await fractalHash(fp, { format: 'png', size: 512 });
  const base64 = dataUrl.split(',')[1];
  const outPath = `examples/gallery/${label}.png`;
  writeFileSync(outPath, Buffer.from(base64, 'base64'));
  console.log(`✅ Saved ${outPath}`);
}
