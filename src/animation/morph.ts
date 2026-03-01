import { FractalConfig, FractalType, Color } from '../core/types.js';
import { normalize } from '../core/normalizer.js';
import { extractParameters } from '../core/parameter-extractor.js';
import { renderFractal } from '../fractals/index.js';
import { lerp } from '../utils/math.js';
import { lerpColor } from '../color/gradients.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MorphOptions {
    from: string;        // input hash A
    to: string;          // input hash B
    duration: number;    // ms
    fps: number;         // frames per second (default 30)
    size: number;        // canvas size (square)
    format: 'gif' | 'frames'; // output format
}

// ---------------------------------------------------------------------------
// Interpolation helpers
// ---------------------------------------------------------------------------

/** Interpolate angles via shortest arc */
export function lerpAngle(a: number, b: number, t: number): number {
    let delta = ((b - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    return a + delta * t;
}

/** Interpolate two 5-color palettes */
export function interpolatePalettes(a: Color[], b: Color[], t: number): Color[] {
    return a.map((color, i) => lerpColor(color, b[i], t));
}

/** Interpolate two FractalConfigs at parameter t ∈ [0, 1] */
export function interpolateConfigs(
    a: FractalConfig,
    b: FractalConfig,
    t: number,
    resolvedPaletteA: Color[],
    resolvedPaletteB: Color[],
): FractalConfig & { _blendFractals?: boolean; _configB?: FractalConfig; _paletteB?: Color[] } {
    // For fractal type: use A for first half, B for second half
    // At t=0.5 we flag for crossfade blending
    const fractalType: FractalType = t < 0.5 ? a.fractalType : b.fractalType;
    const needsBlend = a.fractalType !== b.fractalType && t > 0.3 && t < 0.7;

    const config: FractalConfig = {
        fractalType,
        seed: {
            cReal: lerp(a.seed.cReal, b.seed.cReal, t),
            cImaginary: lerp(a.seed.cImaginary, b.seed.cImaginary, t),
        },
        palette: {
            baseHue: lerp(a.palette.baseHue, b.palette.baseHue, t),
            saturationProfile: t < 0.5 ? a.palette.saturationProfile : b.palette.saturationProfile,
            harmony: t < 0.5 ? a.palette.harmony : b.palette.harmony,
        },
        symmetry: {
            order: Math.round(lerp(a.symmetry.order, b.symmetry.order, t)),
            reflectionAxis: lerpAngle(a.symmetry.reflectionAxis, b.symmetry.reflectionAxis, t),
        },
        iterations: Math.round(lerp(a.iterations, b.iterations, t)),
        rotation: lerpAngle(a.rotation, b.rotation, t),
        branchAngle: lerpAngle(a.branchAngle, b.branchAngle, t),
        viewport: {
            zoom: lerp(a.viewport.zoom, b.viewport.zoom, t),
            centerX: lerp(a.viewport.centerX, b.viewport.centerX, t),
            centerY: lerp(a.viewport.centerY, b.viewport.centerY, t),
        },
        style: {
            lineWeight: lerp(a.style.lineWeight, b.style.lineWeight, t),
            dashed: t < 0.5 ? a.style.dashed : b.style.dashed,
            glowIntensity: lerp(a.style.glowIntensity, b.style.glowIntensity, t),
        },
        background: {
            darkMode: t < 0.5 ? a.background.darkMode : b.background.darkMode,
            patternIntensity: lerp(a.background.patternIntensity, b.background.patternIntensity, t),
            vignetteStrength: lerp(a.background.vignetteStrength, b.background.vignetteStrength, t),
        },
        animationSeed: t < 0.5 ? a.animationSeed : b.animationSeed,
    };

    const result = config as FractalConfig & { _blendFractals?: boolean; _configB?: FractalConfig; _paletteB?: Color[] };
    if (needsBlend) {
        result._blendFractals = true;
        result._configB = b;
        result._paletteB = resolvedPaletteB;
    }

    return result;
}

// ---------------------------------------------------------------------------
// GIF89a encoder (minimal, no dependencies)
// ---------------------------------------------------------------------------

/** Quantize RGBA pixels to a 256-color palette using median-cut approximation */
function buildColorTable(frames: Uint8ClampedArray[], size: number): Uint8Array {
    // Sample pixels from all frames to build a frequency-based palette
    const colorCounts = new Map<number, number>();
    for (const frame of frames) {
        for (let i = 0; i < frame.length; i += 4) {
            // Quantize to 6-bit per channel (64 levels) to reduce color space
            const r = frame[i] & 0xFC;
            const g = frame[i + 1] & 0xFC;
            const b = frame[i + 2] & 0xFC;
            const key = (r << 16) | (g << 8) | b;
            colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
        }
    }

    // Sort by frequency and take top 255 (reserve index 0 for transparency/background)
    const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]);
    const table = new Uint8Array(256 * 3);
    const count = Math.min(sorted.length, 256);
    for (let i = 0; i < count; i++) {
        const color = sorted[i][0];
        table[i * 3] = (color >> 16) & 0xFF;
        table[i * 3 + 1] = (color >> 8) & 0xFF;
        table[i * 3 + 2] = color & 0xFF;
    }
    return table;
}

/** Find the nearest color index in the palette */
function nearestColor(r: number, g: number, b: number, table: Uint8Array): number {
    // Quantize to match the table construction
    const qr = r & 0xFC;
    const qg = g & 0xFC;
    const qb = b & 0xFC;
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < 256; i++) {
        const dr = qr - table[i * 3];
        const dg = qg - table[i * 3 + 1];
        const db = qb - table[i * 3 + 2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist === 0) return i;
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }
    return bestIdx;
}

/** LZW compression for GIF */
function lzwCompress(indices: Uint8Array, minCodeSize: number): Uint8Array {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;

    // Initialize dictionary with single-character entries
    const dictionary = new Map<string, number>();
    for (let i = 0; i < clearCode; i++) {
        dictionary.set(String(i), i);
    }

    const output: number[] = [];
    let bits = 0;
    let bitCount = 0;

    function writeBits(code: number, size: number) {
        bits |= code << bitCount;
        bitCount += size;
        while (bitCount >= 8) {
            output.push(bits & 0xFF);
            bits >>= 8;
            bitCount -= 8;
        }
    }

    writeBits(clearCode, codeSize);

    let current = String(indices[0]);

    for (let i = 1; i < indices.length; i++) {
        const next = String(indices[i]);
        const combined = current + ',' + next;

        if (dictionary.has(combined)) {
            current = combined;
        } else {
            writeBits(dictionary.get(current)!, codeSize);
            if (nextCode < 4096) {
                dictionary.set(combined, nextCode++);
                if (nextCode > (1 << codeSize) && codeSize < 12) {
                    codeSize++;
                }
            } else {
                // Reset dictionary
                writeBits(clearCode, codeSize);
                dictionary.clear();
                for (let j = 0; j < clearCode; j++) {
                    dictionary.set(String(j), j);
                }
                codeSize = minCodeSize + 1;
                nextCode = eoiCode + 1;
            }
            current = next;
        }
    }

    writeBits(dictionary.get(current)!, codeSize);
    writeBits(eoiCode, codeSize);

    // Flush remaining bits
    if (bitCount > 0) {
        output.push(bits & 0xFF);
    }

    return new Uint8Array(output);
}

/** Encode frames into a GIF89a animated image */
function encodeGif(
    frames: Uint8ClampedArray[],
    width: number,
    height: number,
    delayCs: number, // delay in centiseconds per frame
): Uint8Array {
    const colorTable = buildColorTable(frames, width * height);
    const parts: Uint8Array[] = [];

    // --- GIF Header ---
    parts.push(new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
    ]));

    // --- Logical Screen Descriptor ---
    const lsd = new Uint8Array(7);
    lsd[0] = width & 0xFF;
    lsd[1] = (width >> 8) & 0xFF;
    lsd[2] = height & 0xFF;
    lsd[3] = (height >> 8) & 0xFF;
    lsd[4] = 0xF7; // Global color table flag, 8 bits per pixel (256 colors)
    lsd[5] = 0;    // Background color index
    lsd[6] = 0;    // Pixel aspect ratio
    parts.push(lsd);

    // --- Global Color Table (256 × 3 bytes) ---
    parts.push(colorTable);

    // --- Netscape Application Extension (for looping) ---
    parts.push(new Uint8Array([
        0x21, 0xFF, // Extension introducer, Application Extension
        0x0B,       // Block size
        0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, // "NETSCAPE"
        0x32, 0x2E, 0x30, // "2.0"
        0x03, 0x01, // Sub-block size, loop sub-block ID
        0x00, 0x00, // Loop count (0 = infinite)
        0x00,       // Block terminator
    ]));

    // --- Frames ---
    for (const frame of frames) {
        // Graphic Control Extension
        parts.push(new Uint8Array([
            0x21, 0xF9, // Extension introducer, GCE label
            0x04,       // Block size
            0x00,       // Packed byte (no transparency, no disposal)
            delayCs & 0xFF, (delayCs >> 8) & 0xFF, // Delay time
            0x00,       // Transparent color index
            0x00,       // Block terminator
        ]));

        // Image Descriptor
        const imgDesc = new Uint8Array(10);
        imgDesc[0] = 0x2C; // Image separator
        // Position: 0, 0
        imgDesc[1] = 0; imgDesc[2] = 0; // Left
        imgDesc[3] = 0; imgDesc[4] = 0; // Top
        imgDesc[5] = width & 0xFF; imgDesc[6] = (width >> 8) & 0xFF;
        imgDesc[7] = height & 0xFF; imgDesc[8] = (height >> 8) & 0xFF;
        imgDesc[9] = 0x00; // No local color table
        parts.push(imgDesc);

        // Convert RGBA pixels to indexed
        const indices = new Uint8Array(width * height);
        for (let p = 0; p < width * height; p++) {
            indices[p] = nearestColor(
                frame[p * 4],
                frame[p * 4 + 1],
                frame[p * 4 + 2],
                colorTable,
            );
        }

        // LZW compressed image data
        const minCodeSize = 8;
        const compressed = lzwCompress(indices, minCodeSize);

        // Write as sub-blocks
        parts.push(new Uint8Array([minCodeSize]));
        let offset = 0;
        while (offset < compressed.length) {
            const blockLen = Math.min(255, compressed.length - offset);
            parts.push(new Uint8Array([blockLen]));
            parts.push(compressed.subarray(offset, offset + blockLen));
            offset += blockLen;
        }
        parts.push(new Uint8Array([0x00])); // Block terminator
    }

    // --- Trailer ---
    parts.push(new Uint8Array([0x3B]));

    // Concatenate all parts
    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLen);
    let pos = 0;
    for (const part of parts) {
        result.set(part, pos);
        pos += part.length;
    }
    return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

import { generatePalette } from '../color/palette-generator.js';

/**
 * Generate an animated morph between two fractal hashes.
 *
 * @returns GIF bytes (format='gif') or array of frame pixel arrays (format='frames')
 */
export async function morphFractals(
    options: MorphOptions,
): Promise<Uint8Array | Uint8Array[]> {
    const { from, to, duration, fps = 30, size, format } = options;

    // Normalize and extract configs
    const bytesA = await normalize(from);
    const bytesB = await normalize(to);
    const configA = extractParameters(bytesA);
    const configB = extractParameters(bytesB);
    const paletteA = generatePalette(configA.palette);
    const paletteB = generatePalette(configB.palette);

    const frameCount = Math.max(2, Math.round((duration / 1000) * fps));
    const renderedFrames: Uint8ClampedArray[] = [];

    for (let i = 0; i < frameCount; i++) {
        const t = frameCount === 1 ? 0 : i / (frameCount - 1);
        const interpolated = interpolateConfigs(configA, configB, t, paletteA, paletteB);

        // Render primary fractal
        const { pixels: primaryPixels } = renderFractal(interpolated, size, size);

        if (interpolated._blendFractals && interpolated._configB) {
            // Cross-fade blend: render both fractal types and alpha-blend
            const altConfig = { ...interpolated, fractalType: interpolated._configB.fractalType };
            const { pixels: altPixels } = renderFractal(altConfig, size, size);

            // Blend factor: smoothstep around t=0.5
            const blendT = Math.max(0, Math.min(1, (t - 0.3) / 0.4));
            const smooth = blendT * blendT * (3 - 2 * blendT); // smoothstep

            const blended = new Uint8ClampedArray(primaryPixels.length);
            for (let p = 0; p < primaryPixels.length; p++) {
                blended[p] = Math.round(primaryPixels[p] * (1 - smooth) + altPixels[p] * smooth);
            }
            renderedFrames.push(blended);
        } else {
            renderedFrames.push(primaryPixels);
        }
    }

    if (format === 'frames') {
        return renderedFrames.map(f => new Uint8Array(f.buffer, f.byteOffset, f.byteLength));
    }

    // Encode as GIF
    const delayCs = Math.round(100 / fps); // centiseconds per frame
    return encodeGif(renderedFrames, size, size, delayCs);
}
