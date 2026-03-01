/**
 * Browser-safe entry point for the Fractal-Hash browser extension bundle.
 *
 * Imports only the canvas renderer (avoids node:zlib from png-renderer and
 * node:process from ansi-renderer). Compiled to lib/fractal-hash.min.js by
 * build.sh via esbuild --format=iife --global-name=FractalHash.
 */

import { normalize } from '../../../src/core/normalizer.js';
import { extractParameters } from '../../../src/core/parameter-extractor.js';
import { renderToCanvas } from '../../../src/renderers/canvas-renderer.js';
import type { FractalHashOptions } from '../../../src/core/types.js';

export { normalize, extractParameters, renderToCanvas };

export async function fractalHash(input: string, options?: FractalHashOptions): Promise<string> {
  const bytes = await normalize(input);
  const config = extractParameters(bytes);

  if (options?.background) {
    config.background.darkMode = options.background !== 'light';
  }

  return renderToCanvas(config, options ?? {}).dataUrl;
}
