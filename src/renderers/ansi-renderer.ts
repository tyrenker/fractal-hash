import { FractalConfig } from '../core/types.js';
import { renderFractal } from '../fractals/index.js';

const RESET = '\x1b[0m';

function ansiColor(fr: number, fg: number, fb: number, br: number, bg: number, bb: number): string {
  return `\x1b[38;2;${fr};${fg};${fb}m\x1b[48;2;${br};${bg};${bb}m`;
}

/**
 * Render fractal as ANSI block art using the ▀ (upper-half-block) character.
 * Each character represents two vertically stacked pixels:
 *   foreground = top pixel, background = bottom pixel.
 *
 * @param config - Fractal configuration
 * @param columns - Terminal width in characters (defaults to process.stdout.columns or 80)
 */
export function renderToAnsi(config: FractalConfig, columns?: number): string {
  const termCols = typeof process !== 'undefined' ? (process.stdout.columns ?? 80) : 80;
  const cols = columns ?? Math.min(termCols, 48); // Cap at 48 for a compact display
  const rows = Math.ceil(cols / 2);
  const width = cols;
  const height = rows * 2; // 2 pixel rows per character row

  const { pixels } = renderFractal(config, width, height);

  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      // Top pixel (foreground)
      const topIdx = (row * 2 * width + col) * 4;
      const fr = pixels[topIdx];
      const fg = pixels[topIdx + 1];
      const fb = pixels[topIdx + 2];

      // Bottom pixel (background)
      const botIdx = ((row * 2 + 1) * width + col) * 4;
      const br = pixels[botIdx];
      const bg = pixels[botIdx + 1];
      const bb = pixels[botIdx + 2];

      line += ansiColor(fr, fg, fb, br, bg, bb) + '▀';
    }
    line += RESET;
    lines.push(line);
  }

  return lines.join('\n') + RESET;
}
