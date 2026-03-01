import { FractalConfig } from '../core/types.js';
import { JuliaResult, renderJulia } from './julia.js';
import { renderSierpinski } from './sierpinski.js';
import { renderLSystem } from './lsystem.js';
import { renderDragon } from './dragon.js';

export function renderFractal(config: FractalConfig, width: number, height: number): JuliaResult {
  switch (config.fractalType) {
    case 'julia':      return renderJulia(config, width, height);
    case 'sierpinski': return renderSierpinski(config, width, height);
    case 'lsystem':    return renderLSystem(config, width, height);
    case 'dragon':     return renderDragon(config, width, height);
    case 'koch':       return renderDragon(config, width, height);
    case 'flame':      return renderJulia(config, width, height);
    default:           return renderJulia(config, width, height);
  }
}

export { renderJulia } from './julia.js';
export { renderSierpinski } from './sierpinski.js';
export { renderLSystem } from './lsystem.js';
export { renderDragon } from './dragon.js';
