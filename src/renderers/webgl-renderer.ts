import { FractalConfig } from '../core/types.js';
import { mapRange } from '../utils/math.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WebGLRenderOptions {
    canvas: HTMLCanvasElement;
    config: FractalConfig;
    width: number;
    height: number;
    rotateX?: number;  // 3D camera rotation (radians)
    rotateY?: number;
}

// ---------------------------------------------------------------------------
// Config → uniform mapping (exported for testing)
// ---------------------------------------------------------------------------

/** Map FractalConfig seed.cReal to Mandelbulb power [3, 12] */
export function configToPower(config: FractalConfig): number {
    return mapRange(config.seed.cReal, -2, 2, 3, 12);
}

/** Map FractalConfig seed.cImaginary to camera elevation [-π/3, π/3] */
export function configToElevation(config: FractalConfig): number {
    return mapRange(config.seed.cImaginary, -2, 2, -Math.PI / 3, Math.PI / 3);
}

/** Map FractalConfig rotation to camera azimuth [0, 2π] */
export function configToAzimuth(config: FractalConfig): number {
    return config.rotation; // already in [0, 2π]
}

/** Map FractalConfig viewport.zoom to camera distance [1.5, 4.0] */
export function configToDistance(config: FractalConfig): number {
    return mapRange(config.viewport.zoom, 0.5, 2.0, 1.5, 4.0);
}

// ---------------------------------------------------------------------------
// GLSL shaders (embedded as strings)
// ---------------------------------------------------------------------------

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform float power;
uniform float cameraAzimuth;
uniform float cameraElevation;
uniform float cameraDistance;
uniform vec3 palette[5];

mat3 rotationY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c);
}
mat3 rotationX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c);
}

float mandelbulbDE(vec3 pos, float pw) {
  vec3 z = pos;
  float dr = 1.0;
  float r = 0.0;
  for (int i = 0; i < 64; i++) {
    r = length(z);
    if (r > 2.0) break;
    float theta = acos(z.z / r);
    float phi = atan(z.y, z.x);
    dr = pow(r, pw - 1.0) * pw * dr + 1.0;
    float zr = pow(r, pw);
    theta *= pw;
    phi *= pw;
    z = zr * vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
    z += pos;
  }
  return 0.5 * log(r) * r / dr;
}

vec3 estimateNormal(vec3 p, float pw) {
  float e = 0.001;
  return normalize(vec3(
    mandelbulbDE(p + vec3(e,0,0), pw) - mandelbulbDE(p - vec3(e,0,0), pw),
    mandelbulbDE(p + vec3(0,e,0), pw) - mandelbulbDE(p - vec3(0,e,0), pw),
    mandelbulbDE(p + vec3(0,0,e), pw) - mandelbulbDE(p - vec3(0,0,e), pw)
  ));
}

vec3 mixPalette(vec3 pal[5], float t) {
  float st = clamp(t, 0.0, 1.0) * 4.0;
  int i = int(floor(st));
  float f = fract(st);
  if (i >= 4) return pal[4];
  // Manual indexing since GLSL ES doesn't allow variable array index easily
  vec3 c0, c1;
  if (i == 0) { c0 = pal[0]; c1 = pal[1]; }
  else if (i == 1) { c0 = pal[1]; c1 = pal[2]; }
  else if (i == 2) { c0 = pal[2]; c1 = pal[3]; }
  else { c0 = pal[3]; c1 = pal[4]; }
  return mix(c0, c1, f);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y;
  mat3 camRot = rotationY(cameraAzimuth) * rotationX(cameraElevation);
  vec3 ro = camRot * vec3(0.0, 0.0, cameraDistance);
  vec3 rd = normalize(camRot * vec3(uv, -1.0));

  float t = 0.0;
  float d = 1.0;
  int steps = 0;
  for (int i = 0; i < 128; i++) {
    vec3 p = ro + rd * t;
    d = mandelbulbDE(p, power);
    if (d < 0.001 || t > 10.0) break;
    t += d;
    steps = i;
  }

  vec3 color = vec3(0.02, 0.02, 0.05);
  if (d < 0.001) {
    vec3 p = ro + rd * t;
    vec3 n = estimateNormal(p, power);
    vec3 light = normalize(vec3(1.0, 2.0, 3.0));
    float diff = max(dot(n, light), 0.0);
    float spec = pow(max(dot(reflect(-light, n), -rd), 0.0), 16.0);
    float ci = float(steps) / 128.0;
    vec3 baseColor = mixPalette(palette, ci);
    color = baseColor * (0.2 + 0.6 * diff) + vec3(0.3) * spec;
  }

  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));
  gl_FragColor = vec4(color, 1.0);
}
`;

// ---------------------------------------------------------------------------
// WebGL helpers
// ---------------------------------------------------------------------------

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${info}`);
    }
    return shader;
}

function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Program linking failed: ${info}`);
    }
    return program;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

import { generatePalette } from '../color/palette-generator.js';

/**
 * Render a 3D Mandelbulb fractal using WebGL ray marching.
 * Browser only — requires a WebGL-capable HTMLCanvasElement.
 *
 * @param options - canvas, config, dimensions, optional camera rotation
 */
export function renderWebGL(options: WebGLRenderOptions): void {
    const { canvas, config, width, height, rotateX, rotateY } = options;
    canvas.width = width;
    canvas.height = height;

    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');

    // Compile shaders
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = createProgram(gl, vs, fs);
    gl.useProgram(program);

    // Set up fullscreen quad
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    gl.uniform2f(gl.getUniformLocation(program, 'resolution'), width, height);
    gl.uniform1f(gl.getUniformLocation(program, 'power'), configToPower(config));
    gl.uniform1f(gl.getUniformLocation(program, 'cameraAzimuth'),
        configToAzimuth(config) + (rotateY ?? 0));
    gl.uniform1f(gl.getUniformLocation(program, 'cameraElevation'),
        configToElevation(config) + (rotateX ?? 0));
    gl.uniform1f(gl.getUniformLocation(program, 'cameraDistance'), configToDistance(config));

    // Set palette uniforms
    const palette = generatePalette(config.palette);
    const paletteFlat = new Float32Array(15);
    for (let i = 0; i < 5; i++) {
        paletteFlat[i * 3] = palette[i].r / 255;
        paletteFlat[i * 3 + 1] = palette[i].g / 255;
        paletteFlat[i * 3 + 2] = palette[i].b / 255;
    }
    gl.uniform3fv(gl.getUniformLocation(program, 'palette'), paletteFlat);

    // Render
    gl.viewport(0, 0, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
