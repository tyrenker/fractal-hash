import { FractalConfig, Color } from '../core/types.js';
import { generatePalette } from '../color/palette-generator.js';
import { mapToPalette } from '../color/gradients.js';
import { symmetricPoints } from '../utils/symmetry.js';

export interface JuliaResult {
  width: number;
  height: number;
  /** Flat array of RGBA values: [r,g,b,a, r,g,b,a, ...] */
  pixels: Uint8ClampedArray;
}

function writePixel(pixels: Uint8ClampedArray, x: number, y: number, width: number, height: number, color: Color): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = (y * width + x) * 4;
  pixels[idx] = color.r;
  pixels[idx + 1] = color.g;
  pixels[idx + 2] = color.b;
  pixels[idx + 3] = Math.round(color.a * 255);
}

export function renderJulia(config: FractalConfig, width: number, height: number): JuliaResult {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const palette = generatePalette(config.palette);

  const cReal = config.seed.cReal;
  const cImag = config.seed.cImaginary;
  const maxIter = config.iterations;
  const zoom = config.viewport.zoom;
  const centerX = config.viewport.centerX;
  const centerY = config.viewport.centerY;

  // Pre-compute rotation trig outside pixel loop
  const cosRot = Math.cos(config.rotation);
  const sinRot = Math.sin(config.rotation);

  const halfW = width / 2;
  const halfH = height / 2;

  const symmetryOrder = config.symmetry.order;
  const center = { x: halfW, y: halfH };

  // Interior color: very dark version of palette's first color
  const interiorColor: Color = {
    r: Math.round(palette[0].r * 0.15),
    g: Math.round(palette[0].g * 0.15),
    b: Math.round(palette[0].b * 0.15),
    a: 1,
  };

  // Use escape radius of 256 for smoother coloring
  const escapeRadius = 256;
  const escapeRadiusSq = escapeRadius * escapeRadius;
  const logEscape = Math.log2(Math.log2(escapeRadius));

  // Track which pixels have been written (for symmetry optimization)
  const written = symmetryOrder > 1 ? new Uint8Array(width * height) : null;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (written !== null && written[py * width + px]) continue;

      // Map pixel to complex plane
      let zReal = (px - halfW) / (halfW * zoom) + centerX;
      let zImag = (py - halfH) / (halfH * zoom) + centerY;

      // Apply global rotation
      const zRealRot = zReal * cosRot - zImag * sinRot;
      const zImagRot = zReal * sinRot + zImag * cosRot;
      zReal = zRealRot;
      zImag = zImagRot;

      // Julia iteration: z = z² + c
      let iter = 0;
      while (zReal * zReal + zImag * zImag < escapeRadiusSq && iter < maxIter) {
        const temp = zReal * zReal - zImag * zImag + cReal;
        zImag = 2 * zReal * zImag + cImag;
        zReal = temp;
        iter++;
      }

      let color: Color;
      if (iter >= maxIter) {
        // Point is in the set — use dark interior color
        color = interiorColor;
      } else {
        // Smooth coloring with larger escape radius
        const zMagSq = zReal * zReal + zImag * zImag;
        const smooth = iter + 1 - (Math.log2(Math.log2(zMagSq)) - logEscape);
        // Map directly to palette with enough cycles to show detail
        const normalized = (smooth / maxIter) * 8; // 8 palette cycles
        const wrapped = normalized - Math.floor(normalized);
        color = mapToPalette(wrapped, palette);
      }

      if (symmetryOrder <= 1) {
        writePixel(pixels, px, py, width, height, color);
      } else {
        // Paint all symmetric copies
        const symPoints = symmetricPoints({ x: px, y: py }, symmetryOrder, center);
        for (const pt of symPoints) {
          const sx = Math.round(pt.x);
          const sy = Math.round(pt.y);
          writePixel(pixels, sx, sy, width, height, color);
          if (written !== null && sx >= 0 && sx < width && sy >= 0 && sy < height) {
            written[sy * width + sx] = 1;
          }
        }
      }
    }
  }

  return { width, height, pixels };
}
