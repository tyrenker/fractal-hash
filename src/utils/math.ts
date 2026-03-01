/** Linear interpolation between a and b by factor t (0–1) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp value to [min, max] */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Map a value from [inMin, inMax] to [outMin, outMax] linearly */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Convert degrees to radians */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Smooth iteration count for fractal coloring (eliminates banding).
 * Only meaningful for escaped points (iteration < maxIter).
 *
 * Formula: iteration + 1 - log2(log2(|z|^2))
 */
export function smoothIteration(zReal: number, zImag: number, iteration: number, maxIter: number): number {
  if (iteration >= maxIter) return maxIter;
  const zMagSq = zReal * zReal + zImag * zImag;
  if (zMagSq <= 1) return iteration;
  const log2ZMag = Math.log2(zMagSq) / 2; // = log2(|z|)
  if (log2ZMag <= 0) return iteration;
  return iteration + 1 - Math.log2(log2ZMag);
}
