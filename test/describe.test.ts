import { describe, it, expect } from 'vitest';
import { describeFractal, hueToName } from '../src/accessibility/describe.js';
import { normalize } from '../src/core/normalizer.js';
import { extractParameters } from '../src/core/parameter-extractor.js';
import { FractalConfig } from '../src/core/types.js';

describe('hueToName', () => {
    it('maps 0 to red', () => expect(hueToName(0)).toBe('red'));
    it('maps 30 to orange', () => expect(hueToName(30)).toBe('orange'));
    it('maps 60 to yellow', () => expect(hueToName(60)).toBe('yellow'));
    it('maps 120 to green', () => expect(hueToName(120)).toBe('green'));
    it('maps 180 to teal', () => expect(hueToName(180)).toBe('teal'));
    it('maps 220 to blue', () => expect(hueToName(220)).toBe('blue'));
    it('maps 270 to purple', () => expect(hueToName(270)).toBe('purple'));
    it('maps 320 to pink', () => expect(hueToName(320)).toBe('pink'));
    it('maps 350 to red (wrapping)', () => expect(hueToName(350)).toBe('red'));
    it('handles negative hues', () => expect(hueToName(-10)).toBe('red'));
    it('handles hues > 360', () => expect(hueToName(390)).toBe('orange'));
});

describe('describeFractal', () => {
    it('includes fractal type name', async () => {
        const bytes = await normalize('julia-test');
        const config = extractParameters(bytes);
        config.fractalType = 'julia';
        const desc = describeFractal(config);
        expect(desc).toContain('Julia set');
    });

    it('includes color harmony type', async () => {
        const bytes = await normalize('triadic-test');
        const config = extractParameters(bytes);
        config.palette.harmony = 'triadic';
        const desc = describeFractal(config);
        expect(desc).toContain('triadic');
    });

    it('includes symmetry order', async () => {
        const bytes = await normalize('symmetry-test');
        const config = extractParameters(bytes);
        const desc = describeFractal(config);
        expect(desc).toMatch(/\d-fold rotational symmetry/);
    });

    it('includes complexity descriptor', async () => {
        const bytes = await normalize('complexity-test');
        const config = extractParameters(bytes);
        const desc = describeFractal(config);
        expect(desc).toMatch(/(low|moderate|high) complexity/);
    });

    it('mentions dark or light background', async () => {
        const bytes = await normalize('bg-test');
        const config = extractParameters(bytes);
        const desc = describeFractal(config);
        expect(desc).toMatch(/(Dark|Light) background/);
    });

    it('different configs produce different descriptions', async () => {
        const bytes1 = await normalize('input-1');
        const bytes2 = await normalize('input-2');
        const config1 = extractParameters(bytes1);
        const config2 = extractParameters(bytes2);
        // Force them to differ in fractal type
        config1.fractalType = 'julia';
        config2.fractalType = 'sierpinski';
        const desc1 = describeFractal(config1);
        const desc2 = describeFractal(config2);
        expect(desc1).not.toBe(desc2);
    });

    it('handles all fractal types', () => {
        const types = ['julia', 'sierpinski', 'lsystem', 'dragon', 'koch', 'flame'] as const;
        const baseConfig: FractalConfig = {
            fractalType: 'julia',
            seed: { cReal: 0, cImaginary: 0 },
            palette: { baseHue: 180, saturationProfile: 'vibrant', harmony: 'triadic' },
            symmetry: { order: 4, reflectionAxis: 0 },
            iterations: 200,
            rotation: 0,
            branchAngle: 0.5,
            viewport: { zoom: 1, centerX: 0, centerY: 0 },
            style: { lineWeight: 2, dashed: false, glowIntensity: 0.3 },
            background: { darkMode: true, patternIntensity: 0.5, vignetteStrength: 0.3 },
            animationSeed: new Uint8Array([0, 0, 0, 0]),
        };

        for (const type of types) {
            const config = { ...baseConfig, fractalType: type };
            const desc = describeFractal(config);
            expect(desc.length).toBeGreaterThan(50);
        }
    });
});
