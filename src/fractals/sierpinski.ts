import { FractalConfig } from '../core/types.js';
import { JuliaResult } from './julia.js';
import { generatePalette } from '../color/palette-generator.js';
import { symmetricPoints } from '../utils/symmetry.js';

// ---------------------------------------------------------------------------
// Deterministic PRNG — xorshift32 (seeded from config bytes)
// ---------------------------------------------------------------------------

class DeterministicRNG {
  private state: number;
  constructor(seed: number) { this.state = seed || 1; }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return (x >>> 0) / 0xffffffff;
  }
}

// ---------------------------------------------------------------------------
// Sierpinski Triangle — chaos game method
// ---------------------------------------------------------------------------

export function renderSierpinski(config: FractalConfig, width: number, height: number): JuliaResult {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const palette = generatePalette(config.palette);

  // Dark background from first palette color
  const dark = palette[0];
  const bgR = Math.round(dark.r * 0.12);
  const bgG = Math.round(dark.g * 0.12);
  const bgB = Math.round(dark.b * 0.12);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4]     = bgR;
    pixels[i * 4 + 1] = bgG;
    pixels[i * 4 + 2] = bgB;
    pixels[i * 4 + 3] = 255;
  }

  // Triangle geometry — equilateral, centred in canvas
  const cx = width / 2;
  const cy = height / 2;
  const scale = 0.8 + ((config.seed.cReal + 2) / 4) * 0.15;
  const r = Math.min(width, height) * scale / 2;
  const rotOffset = config.seed.cImaginary * (Math.PI / 4);
  const baseAngle  = config.rotation + rotOffset - Math.PI / 2;

  const vx = [0, 1, 2].map(i => cx + r * Math.cos(baseAngle + (i * 2 * Math.PI) / 3));
  const vy = [0, 1, 2].map(i => cy + r * Math.sin(baseAngle + (i * 2 * Math.PI) / 3));

  // Vertex colors (palette indices 1–3)
  const vR = [palette[1].r, palette[2].r, palette[3].r];
  const vG = [palette[1].g, palette[2].g, palette[3].g];
  const vB = [palette[1].b, palette[2].b, palette[3].b];

  // Seed PRNG from config
  const seed = Math.round(Math.abs(config.seed.cReal * 1973 + config.seed.cImaginary * 9871)) | 0;
  const rng  = new DeterministicRNG(seed || 42);

  // Starting point: centroid
  let px = (vx[0] + vx[1] + vx[2]) / 3;
  let py = (vy[0] + vy[1] + vy[2]) / 3;

  const iterations = Math.min(config.iterations * 500, 250_000);
  const skipFirst  = 20;
  const center     = { x: cx, y: cy };
  const symOrder   = config.symmetry.order;

  function plotPixel(x: number, y: number, r: number, g: number, b: number): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= width || iy < 0 || iy >= height) return;
    const idx = (iy * width + ix) * 4;
    pixels[idx]     = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
    pixels[idx + 3] = 255;
  }

  for (let i = 0; i < iterations; i++) {
    const vi = Math.floor(rng.next() * 3);
    px = (px + vx[vi]) / 2;
    py = (py + vy[vi]) / 2;

    if (i < skipFirst) continue;

    const cr = vR[vi];
    const cg = vG[vi];
    const cb = vB[vi];

    if (symOrder <= 1) {
      plotPixel(px, py, cr, cg, cb);
    } else {
      const pts = symmetricPoints({ x: px, y: py }, symOrder, center);
      for (const pt of pts) plotPixel(pt.x, pt.y, cr, cg, cb);
    }
  }

  return { width, height, pixels };
}
