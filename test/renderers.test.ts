import { describe, it, expect } from 'vitest';
import { renderToSvg } from '../src/renderers/svg-renderer.js';
import { renderToPng } from '../src/renderers/png-renderer.js';
import { renderToAnsi } from '../src/renderers/ansi-renderer.js';
import { FractalConfig } from '../src/core/types.js';

function makeConfig(overrides: Partial<FractalConfig> = {}): FractalConfig {
  return {
    fractalType: 'julia',
    seed: { cReal: -0.7, cImaginary: 0.27 },
    palette: { baseHue: 200, saturationProfile: 'vibrant', harmony: 'complementary' },
    symmetry: { order: 1, reflectionAxis: 0 },
    iterations: 64,
    rotation: 0,
    branchAngle: 0,
    viewport: { zoom: 1, centerX: 0, centerY: 0 },
    style: { lineWeight: 1, dashed: false, glowIntensity: 0 },
    background: { darkMode: true, patternIntensity: 0, vignetteStrength: 0 },
    animationSeed: new Uint8Array([0, 0, 0, 0]),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SVG renderer
// ---------------------------------------------------------------------------

describe('SVG renderer', () => {
  it('output starts with <svg', () => {
    const svg = renderToSvg(makeConfig(), 256);
    expect(svg.trim()).toMatch(/^<svg/);
  });

  it('contains viewBox attribute', () => {
    const svg = renderToSvg(makeConfig(), 256);
    expect(svg).toContain('viewBox');
  });

  it('contains correct width and height', () => {
    const svg = renderToSvg(makeConfig(), 128);
    expect(svg).toContain('width="128"');
    expect(svg).toContain('height="128"');
  });

  it('is valid XML — ends with </svg>', () => {
    const svg = renderToSvg(makeConfig(), 64);
    expect(svg.trim()).toMatch(/<\/svg>\s*$/);
  });

  it('same config → same SVG string (determinism)', () => {
    const cfg = makeConfig();
    expect(renderToSvg(cfg, 256)).toBe(renderToSvg(cfg, 256));
  });

  it('different seed → different SVG', () => {
    const c1 = makeConfig();
    const c2 = makeConfig({ seed: { cReal: 0.355, cImaginary: 0.355 } });
    expect(renderToSvg(c1, 256)).not.toBe(renderToSvg(c2, 256));
  });

  it('contains rect elements', () => {
    const svg = renderToSvg(makeConfig(), 256);
    expect(svg).toContain('<rect');
  });

  it('includes vignette gradient when vignetteStrength > 0', () => {
    const svg = renderToSvg(makeConfig({ background: { darkMode: true, patternIntensity: 0, vignetteStrength: 0.5 } }), 256);
    expect(svg).toContain('vignette');
    expect(svg).toContain('radialGradient');
  });

  it('no vignette elements when vignetteStrength = 0', () => {
    const svg = renderToSvg(makeConfig(), 256);
    expect(svg).not.toContain('radialGradient');
  });
});

// ---------------------------------------------------------------------------
// PNG renderer
// ---------------------------------------------------------------------------

describe('PNG renderer', () => {
  it('output starts with PNG signature bytes', async () => {
    const buf = await renderToPng(makeConfig(), { size: 32 });
    expect(buf[0]).toBe(137);
    expect(buf[1]).toBe(80);  // P
    expect(buf[2]).toBe(78);  // N
    expect(buf[3]).toBe(71);  // G
    expect(buf[4]).toBe(13);
    expect(buf[5]).toBe(10);
    expect(buf[6]).toBe(26);
    expect(buf[7]).toBe(10);
  });

  it('IHDR chunk is at bytes 8–28', async () => {
    const buf = await renderToPng(makeConfig(), { size: 32 });
    // Chunk structure: 4-byte length + 4-byte type + data + 4-byte CRC
    const ihdrType = buf.slice(12, 16).toString('ascii');
    expect(ihdrType).toBe('IHDR');
  });

  it('IHDR encodes correct dimensions (32×32)', async () => {
    const buf = await renderToPng(makeConfig(), { size: 32 });
    // IHDR data starts at byte 16 (after sig=8, length=4, type=4)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(32);
    expect(height).toBe(32);
  });

  it('IEND chunk is at the very end', async () => {
    const buf = await renderToPng(makeConfig(), { size: 32 });
    // PNG chunk layout: [4-byte length][4-byte type][data][4-byte CRC]
    // IEND has no data, so from end: CRC(4) + type(4) + length(4)
    const iendType = buf.slice(buf.length - 8, buf.length - 4).toString('ascii');
    expect(iendType).toBe('IEND');
  });

  it('output has non-zero length', async () => {
    const buf = await renderToPng(makeConfig(), { size: 32 });
    expect(buf.length).toBeGreaterThan(8);
  });

  it('same config → same PNG buffer (determinism)', async () => {
    const cfg = makeConfig();
    const b1 = await renderToPng(cfg, { size: 32 });
    const b2 = await renderToPng(cfg, { size: 32 });
    expect(b1).toEqual(b2);
  });

  it('different config → different PNG buffer', async () => {
    const b1 = await renderToPng(makeConfig(), { size: 32 });
    const b2 = await renderToPng(makeConfig({ seed: { cReal: 0.355, cImaginary: 0.355 } }), { size: 32 });
    expect(b1).not.toEqual(b2);
  });

  it('color type byte is 6 (RGBA)', async () => {
    const buf = await renderToPng(makeConfig(), { size: 32 });
    // Color type is at offset 25 in file (sig=8, len=4, type=4, width=4, height=4, bitDepth=1, colorType=1)
    const colorType = buf[25];
    expect(colorType).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// ANSI renderer
// ---------------------------------------------------------------------------

describe('ANSI renderer', () => {
  it('output contains ANSI escape codes', () => {
    const art = renderToAnsi(makeConfig(), 20);
    expect(art).toContain('\x1b[');
  });

  it('output ends with reset sequence', () => {
    const art = renderToAnsi(makeConfig(), 20);
    expect(art.endsWith('\x1b[0m')).toBe(true);
  });

  it('number of lines equals Math.ceil(cols / 2)', () => {
    const cols = 20;
    const art = renderToAnsi(makeConfig(), cols);
    const lines = art.split('\n');
    expect(lines.length).toBe(Math.ceil(cols / 2));
  });

  it('each line contains the ▀ character', () => {
    const art = renderToAnsi(makeConfig(), 10);
    for (const line of art.split('\n')) {
      expect(line).toContain('▀');
    }
  });

  it('each line ends with reset sequence', () => {
    const art = renderToAnsi(makeConfig(), 10);
    for (const line of art.split('\n')) {
      expect(line).toContain('\x1b[0m');
    }
  });

  it('same config → same ANSI string (determinism)', () => {
    const cfg = makeConfig();
    expect(renderToAnsi(cfg, 20)).toBe(renderToAnsi(cfg, 20));
  });

  it('different config → different ANSI output', () => {
    const a1 = renderToAnsi(makeConfig(), 20);
    const a2 = renderToAnsi(makeConfig({ seed: { cReal: 0.355, cImaginary: 0.355 } }), 20);
    expect(a1).not.toBe(a2);
  });
});

// ---------------------------------------------------------------------------
// fractalHash public API
// ---------------------------------------------------------------------------

describe('fractalHash public API', () => {
  it('returns PNG data URL in Node.js (default format)', async () => {
    const { fractalHash } = await import('../src/index.js');
    const result = await fractalHash('test');
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('returns PNG data URL with explicit png format', async () => {
    const { fractalHash } = await import('../src/index.js');
    const result = await fractalHash('test', { format: 'png', size: 32 });
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('returns SVG string with explicit svg format', async () => {
    const { fractalHash } = await import('../src/index.js');
    const result = await fractalHash('test', { format: 'svg', size: 64 });
    expect(result).toMatch(/^<svg/);
  });

  it('returns ANSI string with explicit ansi format', async () => {
    const { fractalHash } = await import('../src/index.js');
    const result = await fractalHash('test', { format: 'ansi' });
    expect(result).toContain('\x1b[');
  });

  it('same input → same output (determinism)', async () => {
    const { fractalHash } = await import('../src/index.js');
    const r1 = await fractalHash('hello-world', { format: 'png', size: 32 });
    const r2 = await fractalHash('hello-world', { format: 'png', size: 32 });
    expect(r1).toBe(r2);
  });
});
