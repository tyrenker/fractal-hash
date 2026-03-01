import { Color, ColorHarmony, SaturationProfile } from '../core/types.js';

export interface PaletteConfig {
  baseHue: number;           // [0, 360)
  saturationProfile: SaturationProfile;
  harmony: ColorHarmony;
}

/** Convert HSL (h:[0,360], s:[0,1], l:[0,1]) to RGB Color */
export function hslToRgb(h: number, s: number, l: number): Color {
  h = ((h % 360) + 360) % 360;
  const hNorm = h / 360;
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const X = C * (1 - Math.abs((hNorm * 6) % 2 - 1));
  const m = l - C / 2;

  let r = 0, g = 0, b = 0;
  const sector = Math.floor(hNorm * 6);
  switch (sector) {
    case 0: r = C; g = X; b = 0; break;
    case 1: r = X; g = C; b = 0; break;
    case 2: r = 0; g = C; b = X; break;
    case 3: r = 0; g = X; b = C; break;
    case 4: r = X; g = 0; b = C; break;
    default: r = C; g = 0; b = X; break;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: 1,
  };
}

/** Wrap hue to [0, 360) */
function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

/** Saturation and lightness ranges per profile */
interface SLRange {
  sMin: number; sMax: number;
  lMin: number; lMax: number;
}

function getSLRange(profile: SaturationProfile): SLRange {
  switch (profile) {
    case 'vibrant': return { sMin: 0.60, sMax: 1.00, lMin: 0.25, lMax: 0.65 };
    case 'pastel': return { sMin: 0.30, sMax: 0.70, lMin: 0.40, lMax: 0.85 };
    case 'neon': return { sMin: 0.80, sMax: 1.00, lMin: 0.35, lMax: 0.70 };
  }
}

/**
 * Generate a deterministic, harmonious 5-color palette from a PaletteConfig.
 * Colors are ordered darkest → lightest.
 */
export function generatePalette(config: PaletteConfig): Color[] {
  const { baseHue, saturationProfile, harmony } = config;
  const sl = getSLRange(saturationProfile);

  // Step 1: Determine hue angles for harmony
  let hues: number[];
  switch (harmony) {
    case 'complementary':
      hues = [baseHue, wrapHue(baseHue + 180)];
      break;
    case 'analogous':
      hues = [wrapHue(baseHue - 30), baseHue, wrapHue(baseHue + 30)];
      break;
    case 'triadic':
      hues = [baseHue, wrapHue(baseHue + 120), wrapHue(baseHue + 240)];
      break;
    case 'split-complementary':
      hues = [baseHue, wrapHue(baseHue + 150), wrapHue(baseHue + 210)];
      break;
  }

  // Step 2: Expand to exactly 5 colors using lighter/darker variants of primary
  // We always produce 5 via: dark-primary, mid-secondary, primary, light-secondary, light-primary
  const lRange = sl.lMax - sl.lMin;
  const sRange = sl.sMax - sl.sMin;

  const stops: Array<{ h: number; s: number; l: number }> = [
    { h: hues[0], s: sl.sMax, l: sl.lMin },                        // darkest primary
    { h: hues[1 % hues.length], s: sl.sMin + sRange * 0.4, l: sl.lMin + lRange * 0.35 }, // dark secondary
    { h: hues[0], s: sl.sMin + sRange * 0.7, l: sl.lMin + lRange * 0.5 },      // mid primary
    { h: hues[(hues.length - 1) % hues.length], s: sl.sMin + sRange * 0.2, l: sl.lMin + lRange * 0.7 }, // light secondary
    { h: hues[0], s: sl.sMin, l: sl.lMax },                        // lightest primary
  ];

  return stops.map(({ h, s, l }) => hslToRgb(h, s, l));
}
