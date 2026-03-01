import { describe, it, expect } from 'vitest';
import { lerp, clamp, mapRange, degToRad, radToDeg, smoothIteration } from '../src/utils/math.js';

describe('lerp', () => {
  it('midpoint', () => expect(lerp(0, 10, 0.5)).toBe(5));
  it('start (t=0)', () => expect(lerp(0, 10, 0)).toBe(0));
  it('end (t=1)', () => expect(lerp(0, 10, 1)).toBe(10));
  it('negative range', () => expect(lerp(-4, 4, 0.5)).toBe(0));
});

describe('clamp', () => {
  it('below min', () => expect(clamp(-1, 0, 1)).toBe(0));
  it('above max', () => expect(clamp(2, 0, 1)).toBe(1));
  it('in range', () => expect(clamp(0.5, 0, 1)).toBe(0.5));
  it('at min boundary', () => expect(clamp(0, 0, 1)).toBe(0));
  it('at max boundary', () => expect(clamp(1, 0, 1)).toBe(1));
});

describe('mapRange', () => {
  it('maps midpoint of [0,255] to midpoint of [-2,2]', () => {
    expect(mapRange(127.5, 0, 255, -2, 2)).toBeCloseTo(0, 5);
  });
  it('maps 128 from [0,255] to near 0 on [-2,2]', () => {
    // 128/255 * 4 - 2 ≈ 0.00784
    expect(mapRange(128, 0, 255, -2, 2)).toBeCloseTo(0.00784, 3);
  });
  it('maps min to outMin', () => expect(mapRange(0, 0, 255, -2, 2)).toBe(-2));
  it('maps max to outMax', () => expect(mapRange(255, 0, 255, -2, 2)).toBe(2));
});

describe('degToRad', () => {
  it('180° = π', () => expect(degToRad(180)).toBeCloseTo(Math.PI, 10));
  it('90° = π/2', () => expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 10));
  it('0° = 0', () => expect(degToRad(0)).toBe(0));
  it('360° = 2π', () => expect(degToRad(360)).toBeCloseTo(2 * Math.PI, 10));
});

describe('radToDeg', () => {
  it('π = 180°', () => expect(radToDeg(Math.PI)).toBeCloseTo(180, 10));
  it('roundtrip degToRad → radToDeg', () => {
    expect(radToDeg(degToRad(45))).toBeCloseTo(45, 10);
  });
});

describe('smoothIteration', () => {
  it('returns maxIter for non-escaped points', () => {
    expect(smoothIteration(0.5, 0.5, 100, 100)).toBe(100);
  });

  it('returns a non-integer smooth value for escaped points', () => {
    // An escaped point has |z|^2 > 4.
    // For z=(10,0): |z|=10, log2(log2(10)) ≈ 1.73, so result ≈ 50+1-1.73 ≈ 49.27
    // The formula uses log2(|z|) (not log2(|z|^2)) for the standard smooth coloring formula.
    const result = smoothIteration(10, 0, 50, 100);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).not.toBe(50); // must differ from raw integer count
    expect(result).toBeCloseTo(49.27, 1);
  });

  it('produces a finite value for escaped points', () => {
    const result = smoothIteration(3, 4, 80, 100); // |z|^2 = 25
    expect(Number.isFinite(result)).toBe(true);
  });
});
