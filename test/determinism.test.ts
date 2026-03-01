import { describe, it, expect } from 'vitest';
import { normalize } from '../src/core/normalizer.js';
import { extractParameters } from '../src/core/parameter-extractor.js';
import { renderJulia } from '../src/fractals/julia.js';

/**
 * End-to-end determinism test.
 * The full pipeline must produce bit-identical output for the same input, every time.
 */
describe('end-to-end determinism', () => {
  async function pipeline(input: string): Promise<Uint8ClampedArray> {
    const bytes = await normalize(input);
    const config = extractParameters(bytes);
    const { pixels } = renderJulia(config, 64, 64);
    return pixels;
  }

  it('same input → same pixels, 100 times', async () => {
    const first = await pipeline('test');
    for (let i = 0; i < 100; i++) {
      const result = await pipeline('test');
      expect(result).toEqual(first);
    }
  });

  it('known hex hash → same pixels, 100 times', async () => {
    const hex = 'a'.repeat(64);
    const first = await pipeline(hex);
    for (let i = 0; i < 100; i++) {
      expect(await pipeline(hex)).toEqual(first);
    }
  });

  it('different inputs → different pixels', async () => {
    const p1 = await pipeline('hello');
    const p2 = await pipeline('world');
    let diffs = 0;
    for (let i = 0; i < p1.length; i++) {
      if (p1[i] !== p2[i]) diffs++;
    }
    expect(diffs).toBeGreaterThan(0);
  });

  it('1-character difference → different pixels', async () => {
    const p1 = await pipeline('password1');
    const p2 = await pipeline('password2');
    let diffs = 0;
    for (let i = 0; i < p1.length; i++) {
      if (p1[i] !== p2[i]) diffs++;
    }
    expect(diffs).toBeGreaterThan(0);
  });

  it('empty string → deterministic pixels', async () => {
    const first = await pipeline('');
    for (let i = 0; i < 10; i++) {
      expect(await pipeline('')).toEqual(first);
    }
  });

  it('SSH fingerprint format → deterministic pixels', async () => {
    const fp = 'SHA256:47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU';
    const first = await pipeline(fp);
    for (let i = 0; i < 10; i++) {
      expect(await pipeline(fp)).toEqual(first);
    }
  });
});
