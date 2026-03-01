import { describe, it, expect } from 'vitest';
import { renderDragon } from '../src/fractals/dragon.js';
import { FractalConfig } from '../src/core/types.js';

function makeConfig(overrides: Partial<FractalConfig> = {}): FractalConfig {
  return {
    fractalType: 'dragon',
    seed: { cReal: 0.0, cImaginary: 0.0 },
    palette: { baseHue: 30, saturationProfile: 'neon', harmony: 'complementary' },
    symmetry: { order: 1, reflectionAxis: 0 },
    iterations: 300,
    rotation: 0,
    branchAngle: Math.PI / 2,
    viewport: { zoom: 1.0, centerX: 0, centerY: 0 },
    style: { lineWeight: 1, dashed: false, glowIntensity: 0 },
    background: { darkMode: true, patternIntensity: 0, vignetteStrength: 0 },
    animationSeed: new Uint8Array(4),
    ...overrides,
  };
}

describe('renderDragon', () => {
  it('returns correct dimensions', () => {
    const result = renderDragon(makeConfig(), 64, 64);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
    expect(result.pixels.length).toBe(64 * 64 * 4);
  });

  it('returns correct dimensions for non-square', () => {
    const result = renderDragon(makeConfig(), 128, 96);
    expect(result.width).toBe(128);
    expect(result.height).toBe(96);
    expect(result.pixels.length).toBe(128 * 96 * 4);
  });

  it('all pixels are in valid range [0, 255]', () => {
    const { pixels } = renderDragon(makeConfig(), 64, 64);
    for (let i = 0; i < pixels.length; i++) {
      expect(pixels[i]).toBeGreaterThanOrEqual(0);
      expect(pixels[i]).toBeLessThanOrEqual(255);
    }
  });

  it('all alpha values are 255', () => {
    const { pixels } = renderDragon(makeConfig(), 64, 64);
    for (let i = 3; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(255);
    }
  });

  it('is deterministic — same config produces identical output', () => {
    const config = makeConfig();
    const r1 = renderDragon(config, 64, 64);
    const r2 = renderDragon(config, 64, 64);
    expect(r1.pixels).toEqual(r2.pixels);
  });

  it('different iterations produces different output', () => {
    const r1 = renderDragon(makeConfig({ iterations: 100 }), 64, 64);
    const r2 = renderDragon(makeConfig({ iterations: 400 }), 64, 64);
    expect(r1.pixels).not.toEqual(r2.pixels);
  });

  it('different rotation produces different output', () => {
    const r1 = renderDragon(makeConfig({ rotation: 0 }), 64, 64);
    const r2 = renderDragon(makeConfig({ rotation: Math.PI / 3 }), 64, 64);
    expect(r1.pixels).not.toEqual(r2.pixels);
  });

  it('renders within 500ms for 256×256', () => {
    const start = Date.now();
    renderDragon(makeConfig(), 256, 256);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('renders with maximum folds (high iterations)', () => {
    // iterations=512 => folds = min(floor(512/30), 15) = 15
    const result = renderDragon(makeConfig({ iterations: 512 }), 64, 64);
    expect(result.pixels.length).toBe(64 * 64 * 4);
  });
});
