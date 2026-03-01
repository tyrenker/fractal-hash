import { describe, it, expect } from 'vitest';
import { getRandomValues } from 'node:crypto';
import { extractParameters } from '../src/core/parameter-extractor.js';

function makeBytes(fill: number): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

function makeBytesAt(values: Record<number, number>): Uint8Array {
  const bytes = new Uint8Array(32);
  for (const [idx, val] of Object.entries(values)) {
    bytes[Number(idx)] = val;
  }
  return bytes;
}

describe('extractParameters', () => {
  it('throws for input other than 32 bytes', () => {
    expect(() => extractParameters(new Uint8Array(16))).toThrow(RangeError);
    expect(() => extractParameters(new Uint8Array(0))).toThrow(RangeError);
  });

  it('all zeros → valid config', () => {
    const config = extractParameters(makeBytes(0));
    expect(config.fractalType).toBe('julia'); // index 0
    expect(config.seed.cReal).toBeCloseTo(-2, 4);
    expect(config.seed.cImaginary).toBeCloseTo(-2, 4);
    expect(config.iterations).toBe(64);
    expect(config.symmetry.order).toBe(2); // (0 % 7) + 2
    expect(config.background.darkMode).toBe(false); // 0 ≤ 127
  });

  it('all 0xFF → valid config', () => {
    const config = extractParameters(makeBytes(0xff));
    // Byte folding: b[0..7] = 0xFF XOR 0xFF = 0x00 for each
    // So (0x00 << 8 | 0x00) % 6 = 0 → julia
    expect(config.fractalType).toBe('julia');
    // cReal and cImaginary both derived from folded 0x0000 → -2.0
    expect(config.seed.cReal).toBeCloseTo(-2, 4);
    expect(config.seed.cImaginary).toBeCloseTo(-2, 4);
    // Bytes 8+ are unfolded, still 0xFF
    expect(config.iterations).toBe(512);
    expect(config.symmetry.order).toBe(5); // (255 % 7) + 2 = 3 + 2 = 5
    expect(config.background.darkMode).toBe(true); // 255 > 127
  });

  it('fractalType cycles correctly through all 6 types', () => {
    const types = ['julia', 'sierpinski', 'lsystem', 'dragon', 'koch', 'flame'] as const;
    for (let i = 0; i < 6; i++) {
      // Construct bytes[0..1] so that (b0 << 8 | b1) % 6 === i
      const bytes = makeBytesAt({ 0: 0, 1: i });
      const config = extractParameters(bytes);
      expect(config.fractalType).toBe(types[i]);
    }
  });

  it('iteration count is always in [64, 512]', () => {
    for (const fill of [0, 64, 128, 192, 255]) {
      const config = extractParameters(makeBytes(fill));
      expect(config.iterations).toBeGreaterThanOrEqual(64);
      expect(config.iterations).toBeLessThanOrEqual(512);
    }
  });

  it('symmetry order is always in [2, 8]', () => {
    for (let b9 = 0; b9 <= 255; b9 += 17) {
      const bytes = makeBytesAt({ 9: b9 });
      const config = extractParameters(bytes);
      expect(config.symmetry.order).toBeGreaterThanOrEqual(2);
      expect(config.symmetry.order).toBeLessThanOrEqual(8);
    }
  });

  it('viewport zoom is always in [0.3, 2.0]', () => {
    for (const b15 of [0, 64, 128, 192, 255]) {
      const bytes = makeBytesAt({ 15: b15 });
      const config = extractParameters(bytes);
      expect(config.viewport.zoom).toBeGreaterThanOrEqual(0.3);
      expect(config.viewport.zoom).toBeLessThanOrEqual(2.0);
    }
  });

  it('style.lineWeight is always in [1, 5]', () => {
    for (const b18 of [0, 127, 255]) {
      const bytes = makeBytesAt({ 18: b18 });
      const config = extractParameters(bytes);
      expect(config.style.lineWeight).toBeGreaterThanOrEqual(1);
      expect(config.style.lineWeight).toBeLessThanOrEqual(5);
    }
  });

  it('animationSeed is exactly 4 bytes', () => {
    const config = extractParameters(makeBytes(0));
    expect(config.animationSeed.byteLength).toBe(4);
  });

  it('determinism — same bytes → same config', () => {
    const bytes = new Uint8Array(32);
    getRandomValues(bytes);
    const a = extractParameters(bytes);
    const b = extractParameters(bytes);
    expect(a).toEqual(b);
  });

  it('saturation profile thresholds are correct', () => {
    expect(extractParameters(makeBytesAt({ 7: 0 })).palette.saturationProfile).toBe('vibrant');
    expect(extractParameters(makeBytesAt({ 7: 85 })).palette.saturationProfile).toBe('vibrant');
    expect(extractParameters(makeBytesAt({ 7: 86 })).palette.saturationProfile).toBe('pastel');
    expect(extractParameters(makeBytesAt({ 7: 170 })).palette.saturationProfile).toBe('pastel');
    expect(extractParameters(makeBytesAt({ 7: 171 })).palette.saturationProfile).toBe('neon');
    expect(extractParameters(makeBytesAt({ 7: 255 })).palette.saturationProfile).toBe('neon');
  });

  it('color harmony thresholds are correct', () => {
    expect(extractParameters(makeBytesAt({ 8: 0 })).palette.harmony).toBe('complementary');
    expect(extractParameters(makeBytesAt({ 8: 63 })).palette.harmony).toBe('complementary');
    expect(extractParameters(makeBytesAt({ 8: 64 })).palette.harmony).toBe('analogous');
    expect(extractParameters(makeBytesAt({ 8: 127 })).palette.harmony).toBe('analogous');
    expect(extractParameters(makeBytesAt({ 8: 128 })).palette.harmony).toBe('triadic');
    expect(extractParameters(makeBytesAt({ 8: 191 })).palette.harmony).toBe('triadic');
    expect(extractParameters(makeBytesAt({ 8: 192 })).palette.harmony).toBe('split-complementary');
    expect(extractParameters(makeBytesAt({ 8: 255 })).palette.harmony).toBe('split-complementary');
  });
});
