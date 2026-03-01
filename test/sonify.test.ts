import { describe, it, expect } from 'vitest';
import { sonifyHash } from '../src/audio/sonify.js';

describe('sonifyHash', () => {
    it('produces WAV output with valid RIFF/WAVE header', async () => {
        const wav = await sonifyHash('hello');
        const view = new DataView(wav);

        // RIFF header
        expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
        // WAVE format
        expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');
        // fmt sub-chunk
        expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe('fmt ');
        // data sub-chunk
        expect(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39))).toBe('data');
    });

    it('has correct sample rate in header', async () => {
        const sampleRate = 22050;
        const wav = await sonifyHash('test', { sampleRate });
        const view = new DataView(wav);
        expect(view.getUint32(24, true)).toBe(sampleRate); // Sample rate at offset 24
    });

    it('produces non-zero audio data', async () => {
        const wav = await sonifyHash('hello', { duration: 1, sampleRate: 8000 });
        const view = new DataView(wav);
        const dataSize = view.getUint32(40, true);
        expect(dataSize).toBeGreaterThan(0);

        // Check that at least some samples are non-zero
        let hasNonZero = false;
        for (let i = 44; i < Math.min(wav.byteLength, 200); i += 2) {
            if (view.getInt16(i, true) !== 0) {
                hasNonZero = true;
                break;
            }
        }
        expect(hasNonZero).toBe(true);
    });

    it('is deterministic — same input produces identical WAV bytes', async () => {
        const a = await sonifyHash('determinism-test', { duration: 1, sampleRate: 8000 });
        const b = await sonifyHash('determinism-test', { duration: 1, sampleRate: 8000 });
        expect(new Uint8Array(a)).toEqual(new Uint8Array(b));
    });

    it('different inputs produce different WAV output', async () => {
        const a = await sonifyHash('input-a', { duration: 1, sampleRate: 8000 });
        const b = await sonifyHash('input-b', { duration: 1, sampleRate: 8000 });
        const arrA = new Uint8Array(a);
        const arrB = new Uint8Array(b);

        let diffs = 0;
        for (let i = 44; i < Math.min(arrA.length, arrB.length); i++) {
            if (arrA[i] !== arrB[i]) diffs++;
        }
        expect(diffs).toBeGreaterThan(0);
    });

    it('respects custom duration', async () => {
        const sampleRate = 8000;
        const duration = 2;
        const wav = await sonifyHash('duration-test', { duration, sampleRate });
        const view = new DataView(wav);
        const dataSize = view.getUint32(40, true);
        const expectedSamples = duration * sampleRate;
        // Data size should be expectedSamples * 2 (16-bit)
        expect(dataSize).toBe(expectedSamples * 2);
    });
});
