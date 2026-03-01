import { FractalConfig, FractalType, ColorHarmony, SaturationProfile } from '../core/types.js';

// ---------------------------------------------------------------------------
// Hue-to-name mapping
// ---------------------------------------------------------------------------

/** Map a hue angle (0–360) to a human-readable color name */
export function hueToName(hue: number): string {
    // Normalize hue to [0, 360)
    hue = ((hue % 360) + 360) % 360;
    if (hue < 15 || hue >= 345) return 'red';
    if (hue < 45) return 'orange';
    if (hue < 75) return 'yellow';
    if (hue < 150) return 'green';
    if (hue < 195) return 'teal';
    if (hue < 255) return 'blue';
    if (hue < 285) return 'purple';
    if (hue < 345) return 'pink';
    return 'red';
}

// ---------------------------------------------------------------------------
// Fractal type names
// ---------------------------------------------------------------------------

const FRACTAL_NAMES: Record<FractalType, string> = {
    julia: 'Julia set',
    sierpinski: 'Sierpinski triangle',
    lsystem: 'L-System tree',
    dragon: 'Dragon curve',
    koch: 'Koch snowflake',
    flame: 'Flame fractal',
};

// ---------------------------------------------------------------------------
// Harmony names
// ---------------------------------------------------------------------------

const HARMONY_NAMES: Record<ColorHarmony, string> = {
    complementary: 'complementary',
    analogous: 'analogous',
    triadic: 'triadic',
    'split-complementary': 'split-complementary',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get color names for a harmony scheme from a base hue */
function getHarmonyColors(baseHue: number, harmony: ColorHarmony): string[] {
    let hues: number[];
    switch (harmony) {
        case 'complementary':
            hues = [baseHue, (baseHue + 180) % 360];
            break;
        case 'analogous':
            hues = [(baseHue - 30 + 360) % 360, baseHue, (baseHue + 30) % 360];
            break;
        case 'triadic':
            hues = [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
            break;
        case 'split-complementary':
            hues = [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360];
            break;
    }
    // Generate 5 color names (primary variants + harmony colors)
    const names: string[] = [
        `deep ${hueToName(hues[0])}`,
        hueToName(hues[1 % hues.length]),
        hueToName(hues[0]),
        hueToName(hues[hues.length - 1]),
        `light ${hueToName(hues[0])}`,
    ];
    // Deduplicate adjacent entries
    return [...new Set(names)];
}

/** Describe complexity based on iteration count */
function describeComplexity(iterations: number): string {
    if (iterations < 150) return 'low';
    if (iterations < 350) return 'moderate';
    return 'high';
}

/** Describe vignette strength */
function describeVignette(strength: number): string {
    if (strength < 0.15) return 'no';
    if (strength < 0.5) return 'subtle';
    return 'strong';
}

/** Describe saturation profile */
function describeProfile(profile: SaturationProfile): string {
    switch (profile) {
        case 'vibrant': return 'vivid';
        case 'pastel': return 'soft pastel';
        case 'neon': return 'bright neon';
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable text description of a fractal configuration
 * suitable for screen readers and alt text.
 *
 * @example
 * ```
 * "A Julia set fractal with a teal-dominant triadic color palette.
 *  Features 4-fold rotational symmetry. The primary colors are deep teal,
 *  orange, teal, and light teal. Dark background with subtle vignetting.
 *  Overall impression: high complexity."
 * ```
 */
export function describeFractal(config: FractalConfig): string {
    const fractalName = FRACTAL_NAMES[config.fractalType] ?? config.fractalType;
    const dominantColor = hueToName(config.palette.baseHue);
    const harmonyName = HARMONY_NAMES[config.palette.harmony];
    const profileDesc = describeProfile(config.palette.saturationProfile);
    const colorNames = getHarmonyColors(config.palette.baseHue, config.palette.harmony);
    const complexity = describeComplexity(config.iterations);
    const bgMode = config.background.darkMode ? 'Dark' : 'Light';
    const vignette = describeVignette(config.background.vignetteStrength);
    const symmetryOrder = config.symmetry.order;
    const styleDesc = config.style.dashed ? 'dashed' : 'solid';
    const glowDesc = config.style.glowIntensity > 0.5 ? 'strong' :
        config.style.glowIntensity > 0.15 ? 'subtle' : 'no';

    const parts: string[] = [
        `A ${fractalName} fractal with a ${dominantColor}-dominant ${harmonyName} ${profileDesc} color palette.`,
        `Features ${symmetryOrder}-fold rotational symmetry.`,
        `The primary colors are ${colorNames.join(', ')}.`,
        `${bgMode} background with ${vignette} vignetting.`,
        `${styleDesc.charAt(0).toUpperCase() + styleDesc.slice(1)} lines with ${glowDesc} glow.`,
        `Overall impression: ${complexity} complexity.`,
    ];

    return parts.join(' ');
}
