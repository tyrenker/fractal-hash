import { describe, it, expect } from 'vitest';
import { renderJulia, JuliaResult } from '../src/fractals/julia.js';
import { FractalConfig } from '../src/core/types.js';

function makeConfig(cReal: number, cImag: number, overrides: Partial<FractalConfig> = {}): FractalConfig {
  return {
    fractalType: 'julia',
    seed: { cReal, cImaginary: cImag },
    palette: { baseHue: 200, saturationProfile: 'vibrant', harmony: 'complementary' },
    symmetry: { order: 1, reflectionAxis: 0 },
    iterations: 100,
    rotation: 0,
    branchAngle: 0,
    viewport: { zoom: 1, centerX: 0, centerY: 0 },
    style: { lineWeight: 1, dashed: false, glowIntensity: 0 },
    background: { darkMode: true, patternIntensity: 0, vignetteStrength: 0 },
    animationSeed: new Uint8Array([0, 0, 0, 0]),
    ...overrides,
  };
}

describe('renderJulia', () => {
  it('output dimensions match input width/height', () => {
    const config = makeConfig(-0.7, 0.27);
    const result = renderJulia(config, 64, 64);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
  });

  it('pixel array length === width * height * 4', () => {
    const config = makeConfig(-0.7, 0.27);
    const result = renderJulia(config, 64, 48);
    expect(result.pixels.length).toBe(64 * 48 * 4);
  });

  it('same config → same pixel array (determinism)', () => {
    const config = makeConfig(-0.7, 0.27);
    const r1 = renderJulia(config, 64, 64);
    const r2 = renderJulia(config, 64, 64);
    expect(r1.pixels).toEqual(r2.pixels);
  });

  it('different seed → different pixel array', () => {
    const r1 = renderJulia(makeConfig(-0.7, 0.27), 64, 64);
    const r2 = renderJulia(makeConfig(0.355, 0.355), 64, 64);
    // Not all pixels should be identical
    let diffs = 0;
    for (let i = 0; i < r1.pixels.length; i++) {
      if (r1.pixels[i] !== r2.pixels[i]) diffs++;
    }
    expect(diffs).toBeGreaterThan(0);
  });

  it('all pixel values in valid range [0, 255]', () => {
    const config = makeConfig(-0.7, 0.27);
    const result = renderJulia(config, 64, 64);
    for (const v of result.pixels) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });

  it('alpha channel is always 255', () => {
    const config = makeConfig(-0.7, 0.27);
    const { pixels, width, height } = renderJulia(config, 32, 32);
    for (let i = 3; i < width * height * 4; i += 4) {
      expect(pixels[i]).toBe(255);
    }
  });

  it('c = -0.7 + 0.27i — produces non-uniform output (connected Julia set)', () => {
    const config = makeConfig(-0.7, 0.27);
    const { pixels } = renderJulia(config, 64, 64);
    // Connected Julia set should have pixels in the set AND escaped pixels
    const uniqueRed = new Set<number>();
    for (let i = 0; i < pixels.length; i += 4) uniqueRed.add(pixels[i]);
    expect(uniqueRed.size).toBeGreaterThan(5);
  });

  it('c = 0.355 + 0.355i — produces non-uniform output (dendritic)', () => {
    const config = makeConfig(0.355, 0.355);
    const { pixels } = renderJulia(config, 64, 64);
    const uniqueRed = new Set<number>();
    for (let i = 0; i < pixels.length; i += 4) uniqueRed.add(pixels[i]);
    expect(uniqueRed.size).toBeGreaterThan(5);
  });

  it('c = -0.8 + 0.156i — produces non-uniform output (spiral)', () => {
    const config = makeConfig(-0.8, 0.156);
    const { pixels } = renderJulia(config, 64, 64);
    const uniqueRed = new Set<number>();
    for (let i = 0; i < pixels.length; i += 4) uniqueRed.add(pixels[i]);
    expect(uniqueRed.size).toBeGreaterThan(5);
  });

  it('performance: 256×256 renders in < 200ms', () => {
    const config = makeConfig(-0.7, 0.27, { iterations: 256 });
    const start = Date.now();
    renderJulia(config, 256, 256);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('renders correctly with symmetry order 4', () => {
    const config = makeConfig(-0.7, 0.27, {
      symmetry: { order: 4, reflectionAxis: 0 },
    });
    const { pixels, width, height } = renderJulia(config, 64, 64);
    expect(pixels.length).toBe(width * height * 4);
    // All values valid
    for (const v of pixels) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });
});
