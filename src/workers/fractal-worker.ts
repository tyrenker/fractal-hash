import { renderFractal } from '../fractals/index.js';
import { FractalConfig } from '../core/types.js';

interface WorkerRequest {
  config: FractalConfig;
  width: number;
  height: number;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { config, width, height } = event.data;
  const result = renderFractal(config, width, height);
  // Transfer the ArrayBuffer to avoid a copy
  self.postMessage(result, { transfer: [result.pixels.buffer] });
};
