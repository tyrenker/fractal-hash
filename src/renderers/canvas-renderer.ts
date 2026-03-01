import { FractalConfig, FractalHashOptions } from '../core/types.js';
import { renderFractal } from '../fractals/index.js';

export interface CanvasRenderResult {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  dataUrl: string; // data:image/png;base64,... (empty string for OffscreenCanvas)
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error('Canvas API not available. Use png-renderer for Node.js.');
}

function getContext(canvas: HTMLCanvasElement | OffscreenCanvas): CanvasRenderingContext2D {
  if ('toDataURL' in canvas) {
    return (canvas as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
  }
  return (canvas as OffscreenCanvas).getContext('2d') as unknown as CanvasRenderingContext2D;
}

function getDataUrl(canvas: HTMLCanvasElement | OffscreenCanvas): string {
  if ('toDataURL' in canvas && typeof (canvas as HTMLCanvasElement).toDataURL === 'function') {
    return (canvas as HTMLCanvasElement).toDataURL('image/png');
  }
  return ''; // OffscreenCanvas requires async convertToBlob(); caller handles it
}

/**
 * Render fractal to a canvas element. Browser-only.
 * In Node.js, use png-renderer instead.
 */
export function renderToCanvas(config: FractalConfig, options: FractalHashOptions): CanvasRenderResult {
  const size = options.size ?? 256;
  const canvas = createCanvas(size, size);
  const ctx = getContext(canvas);

  if (!ctx) throw new Error('Failed to get 2D context from canvas.');

  // Background
  const bg = options.background ?? (config.background.darkMode ? 'dark' : 'light');
  if (bg === 'dark') {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);
  } else if (bg === 'light') {
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, size, size);
  }

  // Fractal pixel data
  const { pixels } = renderFractal(config, size, size);
  const imageData = ctx.createImageData(size, size);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);

  // Vignette overlay
  if (config.background.vignetteStrength > 0) {
    const vs = config.background.vignetteStrength;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.7);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(0,0,0,${vs})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  // Glow overlay
  if (config.style.glowIntensity > 0) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = config.style.glowIntensity;
    ctx.filter = 'blur(4px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }

  const dataUrl = getDataUrl(canvas);
  return { canvas, dataUrl };
}
