import { FractalConfig } from '../core/types.js';
import { renderFractal } from '../fractals/index.js';

/** Internal raster resolution for Julia SVG output */
const RASTER_SIZE = 64;

function toHex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * Generate an SVG string from a FractalConfig.
 * Julia sets are rendered at 64×64 and encoded as <rect> elements;
 * the SVG viewBox scales them to the requested size.
 */
export function renderToSvg(config: FractalConfig, size: number): string {
  const { pixels } = renderFractal(config, RASTER_SIZE, RASTER_SIZE);

  const bgColor = config.background.darkMode ? '#0a0a0a' : '#fafafa';
  const vs = config.background.vignetteStrength;

  // Build rect elements (one per pixel)
  const rects: string[] = [];
  for (let y = 0; y < RASTER_SIZE; y++) {
    for (let x = 0; x < RASTER_SIZE; x++) {
      const idx = (y * RASTER_SIZE + x) * 4;
      const fill = `#${toHex2(pixels[idx])}${toHex2(pixels[idx + 1])}${toHex2(pixels[idx + 2])}`;
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
    }
  }

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${RASTER_SIZE} ${RASTER_SIZE}" width="${size}" height="${size}">`,
  ];

  if (vs > 0) {
    parts.push(
      `<defs>`,
      `<radialGradient id="vignette" cx="50%" cy="50%" r="50%">`,
      `<stop offset="60%" stop-color="transparent"/>`,
      `<stop offset="100%" stop-color="rgba(0,0,0,${vs})"/>`,
      `</radialGradient>`,
      `</defs>`,
    );
  }

  parts.push(`<rect width="100%" height="100%" fill="${bgColor}"/>`);
  parts.push(...rects);

  if (vs > 0) {
    parts.push(`<rect width="100%" height="100%" fill="url(#vignette)"/>`);
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}
