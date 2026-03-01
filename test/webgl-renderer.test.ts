import { describe, it, expect } from 'vitest';
import { configToPower, configToElevation, configToAzimuth, configToDistance } from '../src/renderers/webgl-renderer.js';
import { FractalConfig } from '../src/core/types.js';

function makeConfig(overrides: Partial<FractalConfig> = {}): FractalConfig {
    return {
        fractalType: 'julia',
        seed: { cReal: 0, cImaginary: 0 },
        palette: { baseHue: 180, saturationProfile: 'vibrant', harmony: 'triadic' },
        symmetry: { order: 4, reflectionAxis: 0 },
        iterations: 200,
        rotation: 0,
        branchAngle: 0.5,
        viewport: { zoom: 1.0, centerX: 0, centerY: 0 },
        style: { lineWeight: 2, dashed: false, glowIntensity: 0.3 },
        background: { darkMode: true, patternIntensity: 0.5, vignetteStrength: 0.3 },
        animationSeed: new Uint8Array([0, 0, 0, 0]),
        ...overrides,
    };
}

describe('configToPower', () => {
    it('maps cReal=-2 to power=3', () => {
        const config = makeConfig({ seed: { cReal: -2, cImaginary: 0 } });
        expect(configToPower(config)).toBeCloseTo(3, 5);
    });

    it('maps cReal=2 to power=12', () => {
        const config = makeConfig({ seed: { cReal: 2, cImaginary: 0 } });
        expect(configToPower(config)).toBeCloseTo(12, 5);
    });

    it('maps cReal=0 to power=7.5 (midpoint)', () => {
        const config = makeConfig({ seed: { cReal: 0, cImaginary: 0 } });
        expect(configToPower(config)).toBeCloseTo(7.5, 5);
    });

    it('always produces values in [3, 12]', () => {
        for (let cr = -2; cr <= 2; cr += 0.5) {
            const config = makeConfig({ seed: { cReal: cr, cImaginary: 0 } });
            const p = configToPower(config);
            expect(p).toBeGreaterThanOrEqual(3);
            expect(p).toBeLessThanOrEqual(12);
        }
    });
});

describe('configToElevation', () => {
    it('maps cImaginary=-2 to -π/3', () => {
        const config = makeConfig({ seed: { cReal: 0, cImaginary: -2 } });
        expect(configToElevation(config)).toBeCloseTo(-Math.PI / 3, 5);
    });

    it('maps cImaginary=2 to π/3', () => {
        const config = makeConfig({ seed: { cReal: 0, cImaginary: 2 } });
        expect(configToElevation(config)).toBeCloseTo(Math.PI / 3, 5);
    });
});

describe('configToAzimuth', () => {
    it('passes rotation through directly', () => {
        const config = makeConfig({ rotation: 1.5 });
        expect(configToAzimuth(config)).toBe(1.5);
    });
});

describe('configToDistance', () => {
    it('maps zoom=0.5 to distance=1.5', () => {
        const config = makeConfig({ viewport: { zoom: 0.5, centerX: 0, centerY: 0 } });
        expect(configToDistance(config)).toBeCloseTo(1.5, 5);
    });

    it('maps zoom=2.0 to distance=4.0', () => {
        const config = makeConfig({ viewport: { zoom: 2.0, centerX: 0, centerY: 0 } });
        expect(configToDistance(config)).toBeCloseTo(4.0, 5);
    });
});
