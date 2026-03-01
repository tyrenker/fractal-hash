import { describe, it, expect } from 'vitest';
import { generatePalette, hslToRgb, PaletteConfig } from '../src/color/palette-generator.js';
import { Color } from '../src/core/types.js';

function hueOfColor(color: Color): number {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return ((h * 60) + 360) % 360;
}

describe('hslToRgb', () => {
  it('converts red correctly', () => {
    const c = hslToRgb(0, 1, 0.5);
    expect(c.r).toBe(255);
    expect(c.g).toBe(0);
    expect(c.b).toBe(0);
    expect(c.a).toBe(1);
  });

  it('converts green correctly', () => {
    const c = hslToRgb(120, 1, 0.5);
    expect(c.r).toBe(0);
    expect(c.g).toBe(255);
    expect(c.b).toBe(0);
  });

  it('converts blue correctly', () => {
    const c = hslToRgb(240, 1, 0.5);
    expect(c.r).toBe(0);
    expect(c.g).toBe(0);
    expect(c.b).toBe(255);
  });

  it('white at S=0 L=1', () => {
    const c = hslToRgb(0, 0, 1);
    expect(c.r).toBe(255);
    expect(c.g).toBe(255);
    expect(c.b).toBe(255);
  });

  it('black at S=0 L=0', () => {
    const c = hslToRgb(0, 0, 0);
    expect(c.r).toBe(0);
    expect(c.g).toBe(0);
    expect(c.b).toBe(0);
  });

  it('wraps hue >= 360', () => {
    const c1 = hslToRgb(0, 1, 0.5);
    const c2 = hslToRgb(360, 1, 0.5);
    expect(c1).toEqual(c2);
  });
});

describe('generatePalette', () => {
  const baseConfig: PaletteConfig = {
    baseHue: 180,
    saturationProfile: 'vibrant',
    harmony: 'complementary',
  };

  it('returns exactly 5 colors', () => {
    const palette = generatePalette(baseConfig);
    expect(palette).toHaveLength(5);
  });

  it('all colors have valid RGB ranges [0-255]', () => {
    const palette = generatePalette(baseConfig);
    for (const c of palette) {
      expect(c.r).toBeGreaterThanOrEqual(0);
      expect(c.r).toBeLessThanOrEqual(255);
      expect(c.g).toBeGreaterThanOrEqual(0);
      expect(c.g).toBeLessThanOrEqual(255);
      expect(c.b).toBeGreaterThanOrEqual(0);
      expect(c.b).toBeLessThanOrEqual(255);
    }
  });

  it('all colors have alpha = 1', () => {
    const palette = generatePalette(baseConfig);
    for (const c of palette) {
      expect(c.a).toBe(1);
    }
  });

  it('same config produces same palette (determinism)', () => {
    const p1 = generatePalette(baseConfig);
    const p2 = generatePalette(baseConfig);
    expect(p1).toEqual(p2);
  });

  it('different baseHue → different palette', () => {
    const p1 = generatePalette({ ...baseConfig, baseHue: 0 });
    const p2 = generatePalette({ ...baseConfig, baseHue: 180 });
    expect(p1).not.toEqual(p2);
  });

  it('different harmony → different palette', () => {
    const p1 = generatePalette({ ...baseConfig, harmony: 'complementary' });
    const p2 = generatePalette({ ...baseConfig, harmony: 'triadic' });
    expect(p1).not.toEqual(p2);
  });

  it('different saturationProfile → different palette', () => {
    const p1 = generatePalette({ ...baseConfig, saturationProfile: 'vibrant' });
    const p2 = generatePalette({ ...baseConfig, saturationProfile: 'pastel' });
    const p3 = generatePalette({ ...baseConfig, saturationProfile: 'neon' });
    expect(p1).not.toEqual(p2);
    expect(p1).not.toEqual(p3);
    expect(p2).not.toEqual(p3);
  });

  it('complementary harmony: first and second hue differ by ~180°', () => {
    // With base 0, complement is 180
    const config: PaletteConfig = { baseHue: 0, saturationProfile: 'vibrant', harmony: 'complementary' };
    const palette = generatePalette(config);
    // palette[0] should be near hue 0 (red), palette[1] near hue 180 (cyan)
    const h0 = hueOfColor(palette[0]);
    const h1 = hueOfColor(palette[1]);
    const diff = Math.abs(h0 - h1);
    const wrappedDiff = Math.min(diff, 360 - diff);
    expect(wrappedDiff).toBeGreaterThan(100);
  });

  it('triadic harmony: produces 5 colors with varied hues', () => {
    const config: PaletteConfig = { baseHue: 0, saturationProfile: 'vibrant', harmony: 'triadic' };
    const palette = generatePalette(config);
    expect(palette).toHaveLength(5);
    // Collect unique hue buckets (rough check)
    const hues = palette.map(hueOfColor);
    const uniqueBuckets = new Set(hues.map(h => Math.floor(h / 60)));
    expect(uniqueBuckets.size).toBeGreaterThanOrEqual(2);
  });

  it('runs 1000 times deterministically', () => {
    const first = generatePalette(baseConfig);
    for (let i = 0; i < 1000; i++) {
      expect(generatePalette(baseConfig)).toEqual(first);
    }
  });
});
