import { Color } from '../core/types.js';

/** Interpolate between two colors. t in [0, 1]. */
export function lerpColor(a: Color, b: Color, t: number): Color {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: a.a + (b.a - a.a) * t,
  };
}

/** Map a normalized value (0–1) to a color from a palette using smooth interpolation. */
export function mapToPalette(value: number, palette: Color[]): Color {
  const n = palette.length;
  const scaledValue = value * (n - 1);
  const index = Math.min(Math.floor(scaledValue), n - 2);
  const t = scaledValue - index;
  return lerpColor(palette[index], palette[index + 1], t);
}

/** Generate a smooth gradient array of N colors from a palette. */
export function generateGradient(palette: Color[], steps: number): Color[] {
  const result: Color[] = [];
  for (let i = 0; i < steps; i++) {
    result.push(mapToPalette(i / (steps - 1), palette));
  }
  return result;
}

/**
 * Map a fractal iteration count to a color using a cyclic palette.
 * Creates the characteristic smooth banding of fractal images.
 *
 * @param iteration - smooth iteration count (may be fractional)
 * @param maxIter - maximum iteration count
 * @param palette - color palette to cycle through
 * @param frequency - how many times the palette cycles across maxIter
 */
export function cyclicMap(
  iteration: number,
  maxIter: number,
  palette: Color[],
  frequency: number = 1,
): Color {
  if (iteration >= maxIter) {
    return palette[palette.length - 1];
  }
  // Normalize iteration to [0, 1) with cyclic wrapping
  const normalized = (iteration * frequency / maxIter) % 1;
  return mapToPalette(normalized < 0 ? normalized + 1 : normalized, palette);
}
