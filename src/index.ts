export type { FractalConfig, FractalHashOptions, Color } from './core/types.js';
export { normalize } from './core/normalizer.js';
export { extractParameters } from './core/parameter-extractor.js';
export { renderJulia } from './fractals/julia.js';
export { generatePalette } from './color/palette-generator.js';
export { renderToCanvas } from './renderers/canvas-renderer.js';
export { renderToSvg } from './renderers/svg-renderer.js';
export { renderToPng } from './renderers/png-renderer.js';
export { renderToAnsi } from './renderers/ansi-renderer.js';
export { morphFractals } from './animation/morph.js';
export { sonifyHash } from './audio/sonify.js';
export { describeFractal } from './accessibility/describe.js';
export { renderWebGL } from './renderers/webgl-renderer.js';

import { normalize } from './core/normalizer.js';
import { extractParameters } from './core/parameter-extractor.js';
import { renderToCanvas } from './renderers/canvas-renderer.js';
import { renderToSvg } from './renderers/svg-renderer.js';
import { renderToPng } from './renderers/png-renderer.js';
import { renderToAnsi } from './renderers/ansi-renderer.js';
import { FractalHashOptions } from './core/types.js';

/**
 * Primary public API: transform any string into fractal art.
 *
 * Returns:
 *  - 'canvas' → data:image/png;base64,... (browser only)
 *  - 'svg'    → raw SVG string
 *  - 'png'    → data:image/png;base64,...
 *  - 'ansi'   → ANSI escape-code string for terminal rendering
 *  - default  → canvas dataUrl in browser, PNG data URL in Node.js
 */
export async function fractalHash(input: string, options?: FractalHashOptions): Promise<string> {
  const bytes = await normalize(input);
  const config = extractParameters(bytes);

  // Apply background override from options
  if (options?.background) {
    config.background.darkMode = options.background !== 'light';
  }

  const format = options?.format;

  // Auto-detect when no format specified
  if (!format) {
    if (typeof window !== 'undefined') {
      return renderToCanvas(config, options ?? {}).dataUrl;
    }
    const buf = await renderToPng(config, options ?? {});
    return `data:image/png;base64,${buf.toString('base64')}`;
  }

  switch (format) {
    case 'canvas':
      return renderToCanvas(config, options ?? {}).dataUrl;
    case 'svg':
      return renderToSvg(config, options?.size ?? 256);
    case 'png': {
      const buf = await renderToPng(config, options ?? {});
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
    case 'ansi':
      return renderToAnsi(config);
    default:
      return renderToAnsi(config);
  }
}
