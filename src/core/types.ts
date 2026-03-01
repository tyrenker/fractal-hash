/** Supported fractal algorithm types */
export type FractalType = 'julia' | 'sierpinski' | 'lsystem' | 'dragon' | 'koch' | 'flame';

/** RGBA color */
export interface Color {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

/** Color harmony strategy */
export type ColorHarmony = 'complementary' | 'analogous' | 'triadic' | 'split-complementary';

/** Saturation profile */
export type SaturationProfile = 'vibrant' | 'pastel' | 'neon';

/** Complete fractal configuration extracted from hash bytes */
export interface FractalConfig {
  fractalType: FractalType;
  seed: {
    cReal: number;       // [-2, 2] — Julia/Mandelbrot c constant (real part)
    cImaginary: number;  // [-2, 2] — Julia/Mandelbrot c constant (imaginary part)
  };
  palette: {
    baseHue: number;                   // [0, 360)
    saturationProfile: SaturationProfile;
    harmony: ColorHarmony;
  };
  symmetry: {
    order: number;          // 2–8 fold rotational symmetry
    reflectionAxis: number; // angle in radians
  };
  iterations: number;    // 64–512
  rotation: number;      // global rotation in radians
  branchAngle: number;   // for L-Systems, in radians
  viewport: {
    zoom: number;        // scale factor [0.3, 2.0]
    centerX: number;     // viewport center offset
    centerY: number;     // viewport center offset
  };
  style: {
    lineWeight: number;    // stroke width [1, 5]
    dashed: boolean;
    glowIntensity: number; // 0–1
  };
  background: {
    darkMode: boolean;
    patternIntensity: number; // 0–1
    vignetteStrength: number; // 0–1
  };
  animationSeed: Uint8Array; // 4 bytes for future animation params
}

/** Options for the main fractalHash() function */
export interface FractalHashOptions {
  size?: number;             // pixel dimensions (square), default 256
  format?: 'png' | 'svg' | 'canvas' | 'ansi';
  background?: 'dark' | 'light' | 'transparent';
  animated?: boolean;
}
