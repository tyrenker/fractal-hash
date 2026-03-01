import { describe, it, expect } from 'vitest';
import { lerpAngle, interpolatePalettes, interpolateConfigs, morphFractals } from '../src/animation/morph.js';
import { normalize } from '../src/core/normalizer.js';
import { extractParameters } from '../src/core/parameter-extractor.js';
import { generatePalette } from '../src/color/palette-generator.js';
import { Color } from '../src/core/types.js';

describe('lerpAngle', () => {
    it('interpolates 0 to π via shortest arc', () => {
        const result = lerpAngle(0, Math.PI, 0.5);
        // Shortest arc from 0 to π goes through -π, midpoint at -π/2
        expect(result).toBeCloseTo(-Math.PI / 2, 5);
    });

    it('returns start when t=0', () => {
        expect(lerpAngle(1.0, 2.0, 0)).toBeCloseTo(1.0, 10);
    });

    it('returns end when t=1', () => {
        expect(lerpAngle(1.0, 2.0, 1)).toBeCloseTo(2.0, 10);
    });

    it('takes shortest arc across 0/2π boundary', () => {
        // From 6.0 (~344°) to 0.3 (~17°) should go forward, not backward
        const result = lerpAngle(6.0, 0.3, 0.5);
        // The midpoint should be near 2π (or just past 0)
        expect(result).toBeGreaterThan(5.5);
    });
});

describe('interpolatePalettes', () => {
    it('returns palette A when t=0', () => {
        const a: Color[] = Array(5).fill({ r: 255, g: 0, b: 0, a: 1 });
        const b: Color[] = Array(5).fill({ r: 0, g: 0, b: 255, a: 1 });
        const result = interpolatePalettes(a, b, 0);
        for (const c of result) {
            expect(c.r).toBe(255);
            expect(c.b).toBe(0);
        }
    });

    it('returns palette B when t=1', () => {
        const a: Color[] = Array(5).fill({ r: 255, g: 0, b: 0, a: 1 });
        const b: Color[] = Array(5).fill({ r: 0, g: 0, b: 255, a: 1 });
        const result = interpolatePalettes(a, b, 1);
        for (const c of result) {
            expect(c.r).toBe(0);
            expect(c.b).toBe(255);
        }
    });

    it('blends at t=0.5', () => {
        const a: Color[] = Array(5).fill({ r: 200, g: 0, b: 0, a: 1 });
        const b: Color[] = Array(5).fill({ r: 0, g: 0, b: 200, a: 1 });
        const result = interpolatePalettes(a, b, 0.5);
        for (const c of result) {
            expect(c.r).toBe(100);
            expect(c.b).toBe(100);
        }
    });
});

describe('interpolateConfigs', () => {
    it('produces valid FractalConfig at t=0.5', async () => {
        const bytesA = await normalize('hello');
        const bytesB = await normalize('world');
        const configA = extractParameters(bytesA);
        const configB = extractParameters(bytesB);
        const paletteA = generatePalette(configA.palette);
        const paletteB = generatePalette(configB.palette);

        const mid = interpolateConfigs(configA, configB, 0.5, paletteA, paletteB);

        // Numeric fields should be between A and B values
        expect(mid.viewport.zoom).toBeGreaterThanOrEqual(Math.min(configA.viewport.zoom, configB.viewport.zoom) - 0.01);
        expect(mid.viewport.zoom).toBeLessThanOrEqual(Math.max(configA.viewport.zoom, configB.viewport.zoom) + 0.01);
        expect(mid.iterations).toBeGreaterThanOrEqual(Math.min(configA.iterations, configB.iterations));
        expect(mid.iterations).toBeLessThanOrEqual(Math.max(configA.iterations, configB.iterations));
    });
});

describe('morphFractals', () => {
    it('returns correct frame count with format=frames', async () => {
        const result = await morphFractals({
            from: 'hello',
            to: 'world',
            duration: 500,
            fps: 10,
            size: 32,
            format: 'frames',
        });

        expect(Array.isArray(result)).toBe(true);
        const frames = result as Uint8Array[];
        expect(frames.length).toBe(5); // 0.5s * 10fps = 5 frames
    });

    it('GIF output starts with GIF89a header', async () => {
        const result = await morphFractals({
            from: 'test-a',
            to: 'test-b',
            duration: 200,
            fps: 5,
            size: 16,
            format: 'gif',
        });

        const gif = result as Uint8Array;
        // GIF89a magic bytes
        expect(gif[0]).toBe(0x47); // G
        expect(gif[1]).toBe(0x49); // I
        expect(gif[2]).toBe(0x46); // F
        expect(gif[3]).toBe(0x38); // 8
        expect(gif[4]).toBe(0x39); // 9
        expect(gif[5]).toBe(0x61); // a
        // Trailer byte
        expect(gif[gif.length - 1]).toBe(0x3B);
    });

    it('is deterministic — same inputs produce identical output', async () => {
        const opts = { from: 'key1', to: 'key2', duration: 200, fps: 5, size: 16, format: 'gif' as const };
        const a = await morphFractals(opts);
        const b = await morphFractals(opts);
        expect(a).toEqual(b);
    });
});
