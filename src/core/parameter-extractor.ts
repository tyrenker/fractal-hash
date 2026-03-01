import type { FractalConfig, FractalType, ColorHarmony, SaturationProfile } from './types.js';

const FRACTAL_TYPES: FractalType[] = ['julia', 'sierpinski', 'lsystem', 'dragon', 'koch', 'flame'];

/** Read two bytes as a big-endian uint16 */
function uint16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 8) | bytes[offset + 1]) >>> 0;
}

/** Map a value from [inMin, inMax] to [outMin, outMax] linearly */
function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Extract a deterministic FractalConfig from exactly 32 bytes.
 * The byte mapping is the single source of truth — never change this function
 * without also updating the spec in docs/RFC_VISUAL_HASH.md.
 */
export function extractParameters(bytes: Uint8Array): FractalConfig {
  if (bytes.length !== 32) {
    throw new RangeError(`extractParameters requires exactly 32 bytes, got ${bytes.length}`);
  }

  // Fold bytes 24–31 into bytes 0–7 so that every input bit influences the
  // visual output. Without this, changes confined to bytes 28–31 (e.g. the
  // last character of a 64-char hex string) would produce identical fractals,
  // violating the perceptual-distinctness invariant.
  const b = new Uint8Array(bytes);
  for (let i = 0; i < 8; i++) {
    b[i] ^= bytes[24 + i];
  }

  // Bytes 0–1: fractal type
  const fractalType: FractalType = FRACTAL_TYPES[uint16(b, 0) % 6];

  // Bytes 2–5: Julia c constant (real and imaginary)
  const cReal = mapRange(uint16(b, 2), 0, 65535, -2, 2);
  const cImaginary = mapRange(uint16(b, 4), 0, 65535, -2, 2);

  // Byte 6: base hue
  const baseHue = (b[6] / 255) * 360;

  // Byte 7: saturation profile
  let saturationProfile: SaturationProfile;
  if (b[7] <= 85) {
    saturationProfile = 'vibrant';
  } else if (b[7] <= 170) {
    saturationProfile = 'pastel';
  } else {
    saturationProfile = 'neon';
  }

  // Byte 8: color harmony
  let harmony: ColorHarmony;
  if (bytes[8] <= 63) {
    harmony = 'complementary';
  } else if (bytes[8] <= 127) {
    harmony = 'analogous';
  } else if (bytes[8] <= 191) {
    harmony = 'triadic';
  } else {
    harmony = 'split-complementary';
  }

  // Byte 9: symmetry order (2–8)
  const symmetryOrder = (bytes[9] % 7) + 2;

  // Byte 10: reflection axis (0–π)
  const reflectionAxis = (bytes[10] / 255) * Math.PI;

  // Bytes 11–12: iteration count (64–512)
  const iterations = Math.round(mapRange(uint16(bytes, 11), 0, 65535, 64, 512));

  // Byte 13: global rotation (0–2π)
  const rotation = (bytes[13] / 255) * 2 * Math.PI;

  // Byte 14: branch angle for L-Systems (0–π)
  const branchAngle = (bytes[14] / 255) * Math.PI;

  // Bytes 15–17: viewport
  const zoom = 0.5 + (bytes[15] / 255) * 1.5;
  const centerX = mapRange(bytes[16], 0, 255, -0.3, 0.3);
  const centerY = mapRange(bytes[17], 0, 255, -0.3, 0.3);

  // Byte 18: line weight (1–5)
  const lineWeight = 1 + (bytes[18] / 255) * 4;

  // Byte 19: dashed flag and glow intensity
  const dashed = bytes[19] > 127;
  const glowIntensity = (bytes[19] % 128) / 127;

  // Byte 20: dark mode
  const darkMode = bytes[20] > 127;

  // Byte 21: pattern intensity
  const patternIntensity = bytes[21] / 255;

  // Byte 22: vignette strength
  const vignetteStrength = bytes[22] / 255;

  // Bytes 24–27: animation seed (4 raw bytes)
  const animationSeed = bytes.slice(24, 28);

  return {
    fractalType,
    seed: { cReal, cImaginary },
    palette: { baseHue, saturationProfile, harmony },
    symmetry: { order: symmetryOrder, reflectionAxis },
    iterations,
    rotation,
    branchAngle,
    viewport: { zoom, centerX, centerY },
    style: { lineWeight, dashed, glowIntensity },
    background: { darkMode, patternIntensity, vignetteStrength },
    animationSeed,
  };
}
