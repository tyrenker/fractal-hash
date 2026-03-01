import { FractalConfig } from '../core/types.js';
import { JuliaResult } from './julia.js';
import { generatePalette } from '../color/palette-generator.js';
import { mapToPalette } from '../color/gradients.js';

// ---------------------------------------------------------------------------
// Bresenham line — drawn into a flat RGBA pixel buffer
// ---------------------------------------------------------------------------

function drawLine(
  pixels: Uint8ClampedArray,
  w: number, h: number,
  x0: number, y0: number,
  x1: number, y1: number,
  r: number, g: number, b: number,
): void {
  let ix0 = Math.round(x0), iy0 = Math.round(y0);
  let ix1 = Math.round(x1), iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const dy = -Math.abs(iy1 - iy0);
  const sx = ix0 < ix1 ? 1 : -1;
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (ix0 >= 0 && ix0 < w && iy0 >= 0 && iy0 < h) {
      const idx = (iy0 * w + ix0) * 4;
      pixels[idx]     = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; ix0 += sx; }
    if (e2 <= dx) { err += dx; iy0 += sy; }
  }
}

// ---------------------------------------------------------------------------
// Dragon Curve — iterative unfolding
// ---------------------------------------------------------------------------

export function renderDragon(config: FractalConfig, width: number, height: number): JuliaResult {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const palette = generatePalette(config.palette);

  // Dark background
  const dark = palette[0];
  const bgR = Math.round(dark.r * 0.1);
  const bgG = Math.round(dark.g * 0.1);
  const bgB = Math.round(dark.b * 0.1);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4]     = bgR;
    pixels[i * 4 + 1] = bgG;
    pixels[i * 4 + 2] = bgB;
    pixels[i * 4 + 3] = 255;
  }

  // Number of folds — each fold doubles the sequence length
  const folds = Math.min(Math.floor(config.iterations / 30), 15);

  // Build the turn sequence: R=true, L=false
  let turns: boolean[] = [true]; // start: [R]
  for (let f = 0; f < folds; f++) {
    const flipped = turns.slice().reverse().map(t => !t);
    turns = [...turns, true, ...flipped];
  }

  // Convert turns to coordinates starting from origin
  let heading = config.rotation; // initial direction in radians
  const step = 1; // unit step; we'll scale later
  let x = 0, y = 0;

  const xs: number[] = [x];
  const ys: number[] = [y];

  const HALF_PI = Math.PI / 2;
  for (const right of turns) {
    heading += right ? -HALF_PI : HALF_PI;
    x += Math.cos(heading) * step;
    y += Math.sin(heading) * step;
    xs.push(x);
    ys.push(y);
  }

  // Bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < minX) minX = xs[i];
    if (xs[i] > maxX) maxX = xs[i];
    if (ys[i] < minY) minY = ys[i];
    if (ys[i] > maxY) maxY = ys[i];
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const margin = 0.1;
  const fitScale = Math.min(width, height) * (1 - margin * 2) * config.viewport.zoom / Math.max(spanX, spanY);

  const offX = width  / 2 - (minX + spanX / 2) * fitScale;
  const offY = height / 2 - (minY + spanY / 2) * fitScale;

  // Draw with palette gradient along path
  const total = turns.length;
  for (let i = 0; i < total; i++) {
    const color = mapToPalette(i / total, palette);
    drawLine(
      pixels, width, height,
      xs[i]   * fitScale + offX,
      ys[i]   * fitScale + offY,
      xs[i+1] * fitScale + offX,
      ys[i+1] * fitScale + offY,
      color.r, color.g, color.b,
    );
  }

  return { width, height, pixels };
}
