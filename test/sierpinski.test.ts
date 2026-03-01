import { describe, it, expect } from 'vitest';
import { renderSierpinski } from '../src/fractals/sierpinski.js';
import { FractalConfig } from '../src/core/types.js';

function makeConfig(overrides: Partial<FractalConfig> = {}): FractalConfig {
  return {
    fractalType: 'sierpinski',
    seed: { cReal: 0.5, cImaginary: 0.3 },
    palette: { baseHue: 200, saturationProfile: 'vibrant', harmony: 'triadic' },
    symmetry: { order: 1, reflectionAxis: 0 },
    iterations: 1,
    rotation: 0,
    branchAngle: Math.PI / 4,
    viewport: { zoom: 1.0, centerX: 0, centerY: 0 },
    style: { lineWeight: 1, dashed: false, glowIntensity: 0 },
    background: { darkMode: true, patternIntensity: 0, vignetteStrength: 0 },
    animationSeed: new Uint8Array(4),
    ...overrides,
  };
}

describe('renderSierpinski', () => {
  it('returns correct dimensions', () => {
    const result = renderSierpinski(makeConfig(), 64, 64);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
    expect(result.pixels.length).toBe(64 * 64 * 4);
  });

  it('returns correct dimensions for non-square', () => {
    const result = renderSierpinski(makeConfig(), 128, 96);
    expect(result.width).toBe(128);
    expect(result.height).toBe(96);
    expect(result.pixels.length).toBe(128 * 96 * 4);
  });

  it('all pixels are in valid range [0, 255]', () => {
    const { pixels } = renderSierpinski(makeConfig(), 64, 64);
    for (let i = 0; i < pixels.length; i++) {
      expect(pixels[i]).toBeGreaterThanOrEqual(0);
      expect(pixels[i]).toBeLessThanOrEqual(255);
    }
  });

  it('all alpha values are 255', () => {
    const { pixels } = renderSierpinski(makeConfig(), 64, 64);
    for (let i = 3; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(255);
    }
  });

  it('is deterministic — same config produces identical output', () => {
    const config = makeConfig();
    const r1 = renderSierpinski(config, 64, 64);
    const r2 = renderSierpinski(config, 64, 64);
    expect(r1.pixels).toEqual(r2.pixels);
  });

  it('different seed produces different output', () => {
    const r1 = renderSierpinski(makeConfig({ seed: { cReal: 0.1, cImaginary: 0.2 } }), 64, 64);
    const r2 = renderSierpinski(makeConfig({ seed: { cReal: 1.5, cImaginary: -0.8 } }), 64, 64);
    expect(r1.pixels).not.toEqual(r2.pixels);
  });

  it('renders within 500ms for 256×256', () => {
    const start = Date.now();
    renderSierpinski(makeConfig(), 256, 256);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('symmetry order > 1 produces output', () => {
    const result = renderSierpinski(
      makeConfig({ symmetry: { order: 3, reflectionAxis: 0 } }),
      64,
      64,
    );
    expect(result.pixels.length).toBe(64 * 64 * 4);
  });
});
