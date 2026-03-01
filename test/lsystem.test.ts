import { describe, it, expect } from 'vitest';
import { renderLSystem } from '../src/fractals/lsystem.js';
import { FractalConfig } from '../src/core/types.js';

function makeConfig(overrides: Partial<FractalConfig> = {}): FractalConfig {
  return {
    fractalType: 'lsystem',
    seed: { cReal: 0.0, cImaginary: 0.0 },
    palette: { baseHue: 120, saturationProfile: 'vibrant', harmony: 'analogous' },
    symmetry: { order: 1, reflectionAxis: 0 },
    iterations: 300,
    rotation: 0,
    branchAngle: Math.PI / 6,
    viewport: { zoom: 1.0, centerX: 0, centerY: 0 },
    style: { lineWeight: 1, dashed: false, glowIntensity: 0 },
    background: { darkMode: true, patternIntensity: 0, vignetteStrength: 0 },
    animationSeed: new Uint8Array(4),
    ...overrides,
  };
}

describe('renderLSystem', () => {
  it('returns correct dimensions', () => {
    const result = renderLSystem(makeConfig(), 64, 64);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
    expect(result.pixels.length).toBe(64 * 64 * 4);
  });

  it('returns correct dimensions for non-square', () => {
    const result = renderLSystem(makeConfig(), 128, 96);
    expect(result.width).toBe(128);
    expect(result.height).toBe(96);
    expect(result.pixels.length).toBe(128 * 96 * 4);
  });

  it('all pixels are in valid range [0, 255]', () => {
    const { pixels } = renderLSystem(makeConfig(), 64, 64);
    for (let i = 0; i < pixels.length; i++) {
      expect(pixels[i]).toBeGreaterThanOrEqual(0);
      expect(pixels[i]).toBeLessThanOrEqual(255);
    }
  });

  it('all alpha values are 255', () => {
    const { pixels } = renderLSystem(makeConfig(), 64, 64);
    for (let i = 3; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(255);
    }
  });

  it('is deterministic — same config produces identical output', () => {
    const config = makeConfig();
    const r1 = renderLSystem(config, 64, 64);
    const r2 = renderLSystem(config, 64, 64);
    expect(r1.pixels).toEqual(r2.pixels);
  });

  it('different seed selects different L-system', () => {
    // cReal maps to L-system index via floor(((cReal+2)/4)*6) % 6
    // cReal=-1.5 → index 0 (Binary Tree), cReal=0.5 → index 3 (Dragon Curve L)
    const r1 = renderLSystem(makeConfig({ seed: { cReal: -1.5, cImaginary: 0 } }), 64, 64);
    const r2 = renderLSystem(makeConfig({ seed: { cReal:  0.5, cImaginary: 0 } }), 64, 64);
    expect(r1.pixels).not.toEqual(r2.pixels);
  });

  it('different branchAngle produces different output', () => {
    const r1 = renderLSystem(makeConfig({ branchAngle: Math.PI / 4 }), 64, 64);
    const r2 = renderLSystem(makeConfig({ branchAngle: Math.PI / 2 }), 64, 64);
    expect(r1.pixels).not.toEqual(r2.pixels);
  });

  it('renders within 500ms for 256×256', () => {
    const start = Date.now();
    renderLSystem(makeConfig(), 256, 256);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('renders all 6 L-system variants', () => {
    // seed.cReal ranges [-2, 2], maps to index via (cReal + 2) / 4 * 6
    const seeds = [-2.0, -0.67, 0.0, 0.67, 1.33, 2.0];
    for (const cReal of seeds) {
      const result = renderLSystem(makeConfig({ seed: { cReal, cImaginary: 0 } }), 32, 32);
      expect(result.pixels.length).toBe(32 * 32 * 4);
    }
  });
});
