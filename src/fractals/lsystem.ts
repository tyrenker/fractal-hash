import { FractalConfig } from '../core/types.js';
import { JuliaResult } from './julia.js';
import { generatePalette } from '../color/palette-generator.js';
import { mapToPalette } from '../color/gradients.js';

// ---------------------------------------------------------------------------
// Bresenham line
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
// L-System rule sets
// ---------------------------------------------------------------------------

interface LSystemDef {
  name: string;
  axiom: string;
  rules: Record<string, string>;
  /** Default turn angle in radians (overridden by config.branchAngle if non-zero) */
  defaultAngle: number;
  /** Draw chars: these cause a forward step + line draw */
  drawChars: Set<string>;
}

const L_SYSTEMS: LSystemDef[] = [
  {
    name: 'Binary Tree',
    axiom: '0',
    rules: { '0': '1[0]0', '1': '11' },
    defaultAngle: Math.PI / 4,
    drawChars: new Set(['0', '1']),
  },
  {
    name: 'Koch Curve',
    axiom: 'F',
    rules: { 'F': 'F+F-F-F+F' },
    defaultAngle: Math.PI / 2,
    drawChars: new Set(['F']),
  },
  {
    name: 'Sierpinski Arrow',
    axiom: 'A',
    rules: { 'A': 'B-A-B', 'B': 'A+B+A' },
    defaultAngle: Math.PI / 3,
    drawChars: new Set(['A', 'B']),
  },
  {
    name: 'Dragon Curve (L)',
    axiom: 'FX',
    rules: { 'X': 'X+YF+', 'Y': '-FX-Y' },
    defaultAngle: Math.PI / 2,
    drawChars: new Set(['F']),
  },
  {
    name: 'Plant',
    axiom: 'X',
    rules: { 'X': 'F+[[X]-X]-F[-FX]+X', 'F': 'FF' },
    defaultAngle: Math.PI / 7,
    drawChars: new Set(['F']),
  },
  {
    name: 'Fern',
    axiom: 'X',
    rules: { 'X': 'F-[[X]+X]+F[+FX]-X', 'F': 'FF' },
    defaultAngle: Math.PI / 8,
    drawChars: new Set(['F']),
  },
];

const MAX_STRING_LEN = 200_000;

function expandLSystem(def: LSystemDef, generations: number): string {
  let s = def.axiom;
  for (let g = 0; g < generations; g++) {
    let next = '';
    for (const ch of s) {
      next += def.rules[ch] ?? ch;
      if (next.length > MAX_STRING_LEN) { next = next.slice(0, MAX_STRING_LEN); break; }
    }
    s = next;
  }
  return s;
}

// ---------------------------------------------------------------------------
// L-System renderer
// ---------------------------------------------------------------------------

export function renderLSystem(config: FractalConfig, width: number, height: number): JuliaResult {
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

  // Select L-system rule set based on config
  const ruleIdx = Math.floor(((config.seed.cReal + 2) / 4) * L_SYSTEMS.length) % L_SYSTEMS.length;
  const def = L_SYSTEMS[ruleIdx];

  // Number of generations
  const maxGens = 7;
  const gens = Math.min(Math.ceil(config.iterations / 100), maxGens);

  const str = expandLSystem(def, gens);

  // Turn angle: prefer config.branchAngle if it's non-negligible, else default
  const angle = config.branchAngle > 0.01 ? config.branchAngle : def.defaultAngle;

  // Step length: scaled from config, will be overridden by bounding box fit
  const stepLen = 1;

  // ── Dry run: collect all segment endpoints ──────────────────────────────
  interface TurtleState { x: number; y: number; heading: number; }
  const stack: TurtleState[] = [];
  let tx = 0, ty = 0, th = config.rotation - Math.PI / 2; // start heading: upward
  let drawCount = 0;

  // Segment storage: flat array [x0,y0,x1,y1, ...]
  const segs: number[] = [];

  for (const ch of str) {
    if (def.drawChars.has(ch)) {
      const nx = tx + Math.cos(th) * stepLen;
      const ny = ty + Math.sin(th) * stepLen;
      segs.push(tx, ty, nx, ny);
      tx = nx; ty = ny;
      drawCount++;
      if (drawCount >= 50_000) break; // safety cap
    } else if (ch === '+') {
      th += angle;
    } else if (ch === '-') {
      th -= angle;
    } else if (ch === '[') {
      stack.push({ x: tx, y: ty, heading: th });
    } else if (ch === ']') {
      const st = stack.pop();
      if (st) { tx = st.x; ty = st.y; th = st.heading; }
    }
  }

  if (segs.length === 0) return { width, height, pixels };

  // ── Compute bounding box ─────────────────────────────────────────────────
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < segs.length; i += 4) {
    if (segs[i]   < minX) minX = segs[i];
    if (segs[i]   > maxX) maxX = segs[i];
    if (segs[i+2] < minX) minX = segs[i+2];
    if (segs[i+2] > maxX) maxX = segs[i+2];
    if (segs[i+1] < minY) minY = segs[i+1];
    if (segs[i+1] > maxY) maxY = segs[i+1];
    if (segs[i+3] < minY) minY = segs[i+3];
    if (segs[i+3] > maxY) maxY = segs[i+3];
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const margin = 0.08;
  const fitScale = Math.min(width, height) * (1 - margin * 2) * config.viewport.zoom / Math.max(spanX, spanY);
  const offX = width  / 2 - (minX + spanX / 2) * fitScale;
  const offY = height / 2 - (minY + spanY / 2) * fitScale;

  // ── Draw all segments with gradient coloring ────────────────────────────
  const total = segs.length / 4;
  for (let i = 0; i < total; i++) {
    const color = mapToPalette(i / total, palette);
    drawLine(
      pixels, width, height,
      segs[i*4]   * fitScale + offX,
      segs[i*4+1] * fitScale + offY,
      segs[i*4+2] * fitScale + offX,
      segs[i*4+3] * fitScale + offY,
      color.r, color.g, color.b,
    );
  }

  return { width, height, pixels };
}
