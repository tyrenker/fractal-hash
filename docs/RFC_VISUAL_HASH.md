# RFC: Visual Hash Representation Standard (Fractal-Hash)

## Status: Draft

## Abstract

This document specifies a deterministic algorithm for converting cryptographic
hash digests into unique visual representations using fractal mathematics.
The goal is to provide "visual fingerprints" that humans can easily recognize
and compare, making hash verification more intuitive than reading hexadecimal strings.

---

## 1. Introduction

Cryptographic fingerprints (SSH host keys, TLS certificate hashes, file checksums)
are typically displayed as hexadecimal or Base64 strings. These formats are
difficult for humans to compare visually — a single changed character in a 64-char
hex string is easily missed.

This specification defines a deterministic mapping from any 256-bit hash to a
unique fractal image, creating a "visual fingerprint" that makes differences
immediately apparent to the human eye.

**Design goals:**
- **Strict determinism:** identical input → identical output, across all platforms
- **Perceptual distinctness:** small input changes → visually different fractals
- **Zero runtime dependencies:** implementation uses only native platform APIs

---

## 2. Terminology

| Term              | Definition |
|-------------------|-----------|
| Input Hash        | Any sequence of bytes representing a cryptographic digest, fingerprint, or arbitrary string |
| Normalized Hash   | A 32-byte (256-bit) representation derived from the Input Hash via Section 3 |
| Fractal Config    | The set of rendering parameters extracted from the Normalized Hash via Section 4 |
| Visual Fingerprint| The deterministic fractal image produced from the Fractal Config via Section 5 |

---

## 3. Hash Normalization

All inputs MUST be normalized to exactly 32 bytes before parameter extraction.

### 3.1 Detection Order

Implementations MUST attempt the following decodings in order:

1. **SSH fingerprint prefix** — if input matches `^(SHA256|MD5):(.+)$`, strip prefix and Base64-decode the payload.
2. **Colon-separated hex** — if input matches `^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2})+$`, strip colons and hex-decode.
3. **0x-prefixed hex** — if input matches `^0x[0-9a-fA-F]+$` with even length, strip prefix and hex-decode.
4. **Pure hex string** — if input is ≥64 hex characters (even length), hex-decode the first 64 characters.
5. **Base64** — if input is ≥43 characters and valid Base64, decode.
6. **Fallback** — compute SHA-256 of the UTF-8 encoded input string.

### 3.2 Length Normalization

After decoding, the result MUST be exactly 32 bytes:
- If longer than 32 bytes, truncate to the first 32 bytes.
- If shorter than 32 bytes, zero-pad to 32 bytes.

---

## 4. Parameter Extraction

### 4.1 Byte Folding (Perceptual-Distinctness Requirement)

Before field mapping, implementations MUST fold bytes 24–31 into bytes 0–7
using XOR. This ensures that every bit of the 32-byte input influences the
visual output, satisfying the perceptual-distinctness design goal. Without
this step, a change confined to the last four bytes of a raw 64-character hex
input (bytes 28–31) would produce identical visual output.

```
for i in 0..7:
  b[i] = input[i] XOR input[24 + i]
for i in 8..31:
  b[i] = input[i]
```

All field mappings below read from the folded array `b`, except
`animationSeed` which reads the original bytes 24–27 directly.

### 4.2 Field Mapping

| Bytes    | Source | Parameter              | Mapping                                                    |
|----------|--------|------------------------|------------------------------------------------------------|
| `0–1`    | folded | `fractalType`          | `(b0 << 8 \| b1) % 6` → julia, sierpinski, lsystem, dragon, koch, flame |
| `2–3`    | folded | `seed.cReal`           | `uint16` mapped linearly to `[-2, 2]`                      |
| `4–5`    | folded | `seed.cImaginary`      | `uint16` mapped linearly to `[-2, 2]`                      |
| `6`      | folded | `palette.baseHue`      | `(b6 / 255) * 360` degrees                                 |
| `7`      | folded | `palette.satProfile`   | `0–85` → vibrant, `86–170` → pastel, `171–255` → neon      |
| `8`      | raw    | `palette.harmony`      | `0–63` → complementary, `64–127` → analogous, `128–191` → triadic, `192–255` → split-comp |
| `9`      | raw    | `symmetry.order`       | `(b9 % 7) + 2` → 2 to 8 fold                              |
| `10`     | raw    | `symmetry.axis`        | `(b10 / 255) * π` radians                                  |
| `11–12`  | raw    | `iterations`           | `uint16` mapped to `[64, 512]`, rounded                    |
| `13`     | raw    | `rotation`             | `(b13 / 255) * 2π` radians                                 |
| `14`     | raw    | `branchAngle`          | `(b14 / 255) * π` radians (L-Systems only)                 |
| `15`     | raw    | `viewport.zoom`        | `0.5 + (b15 / 255) * 1.5`                                  |
| `16`     | raw    | `viewport.centerX`     | mapped to `[-0.3, 0.3]`                                    |
| `17`     | raw    | `viewport.centerY`     | mapped to `[-0.3, 0.3]`                                    |
| `18`     | raw    | `style.lineWeight`     | `1 + (b18 / 255) * 4`                                      |
| `19`     | raw    | `style.dashed/glow`    | `b19 > 127` → dashed; glow = `(b19 % 128) / 127`          |
| `20`     | raw    | `background.darkMode`  | `b20 > 127` → dark mode                                    |
| `21`     | raw    | `background.pattern`   | `b21 / 255`                                                 |
| `22`     | raw    | `background.vignette`  | `b22 / 255`                                                 |
| `24–27`  | raw    | `animationSeed`        | 4 raw bytes for animation parameters                        |

### 4.3 uint16 Mapping

```
function mapUint16ToRange(b0, b1, outMin, outMax):
  value = (b0 << 8) | b1    // big-endian uint16, range [0, 65535]
  return outMin + (value / 65535) * (outMax - outMin)
```

---

## 5. Fractal Rendering Algorithms

### 5.1 Julia Set (`fractalType = 0`)

```
For each pixel (px, py) in [0, width) × [0, height):
  x = (px / width  - 0.5) * (4 / zoom) + centerX
  y = (py / height - 0.5) * (4 / zoom) + centerY
  zr = x, zi = y
  for i = 0 to iterations:
    if zr² + zi² > 256:  // escape radius = 256
      break
    (zr, zi) = (zr² - zi² + cReal, 2·zr·zi + cImaginary)
  smoothIter = i + 1 - log2(log2(sqrt(zr² + zi²)))
  color = cyclicPalette(smoothIter / iterations)
```

### 5.2 Sierpinski Triangle (`fractalType = 1`)

Chaos game algorithm with 3 vertices and configurable initial seed point.
Deterministic PRNG seeded from the hash bytes.

### 5.3 L-System (`fractalType = 2`)

Rule-based rewriting system with `branchAngle` and `rotation` from config.
Turtle graphics interpretation for rendering.

### 5.4 Dragon Curve (`fractalType = 3`)

Iterative unfolding algorithm. The curve direction at each step is
determined by the bit pattern. Rendered with `lineWeight` and `rotation`.

---

## 6. Color Specification

### 6.1 HSL to RGB Conversion

```
function hslToRgb(h, s, l):   // h:[0,360], s:[0,1], l:[0,1]
  C = (1 - |2l - 1|) × s
  X = C × (1 - |(h/60) mod 2 - 1|)
  m = l - C/2
  // Select (r,g,b) based on hue sector, add m, scale to [0,255]
```

### 6.2 Color Harmonies

Five-color palettes are generated from the base hue using harmony rules:
- **Complementary:** base, base+180°
- **Analogous:** base-30°, base, base+30°
- **Triadic:** base, base+120°, base+240°
- **Split-complementary:** base, base+150°, base+210°

Hue values are expanded to 5 stops with varying saturation and lightness
per the saturation profile (vibrant, pastel, neon).

### 6.3 Cyclic Palette Interpolation

Smooth color transitions use linear interpolation between adjacent palette
stops with cyclic wrapping based on iteration count:

```
normalizedT = (iteration × frequency / maxIteration) mod 1.0
color = lerpColor(palette[floor(T × 4)], palette[ceil(T × 4)], fract(T × 4))
```

---

## 7. Test Vectors

The following inputs, when processed through Sections 3–4, MUST produce
the specified parameter values.

### Vector 1: `"hello"`
```
SHA-256:     2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
Fold XOR:    b[0..7] = [2c,f2,4d,ba,5f,b0,a3,0e] XOR [73,04,33,62,93,8b,98,24]
                     = [5f,f6,7e,d8,cc,3b,3b,2a]
fractalType: lsystem
cReal:       -0.018
cImaginary:  1.191
baseHue:     83.3
satProfile:  vibrant
harmony:     complementary
symmetry:    3
iterations:  139
zoom:        1.4294
```

### Vector 2: `"world"`
```
SHA-256:     486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7
Fold XOR:    b[0..7] = [48,6e,a4,62,24,d1,bb,4f] XOR [5a,6c,65,26,0e,9c,b8,a7]
                     = [12,02,c1,44,2a,4d,03,e8]
fractalType: lsystem
cReal:       1.020
cImaginary:  -1.339
baseHue:     4.2
satProfile:  neon
harmony:     triadic
symmetry:    4
iterations:  203
zoom:        1.1235
```

### Vector 3: `"test"`
```
SHA-256:     9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
Fold XOR:    b[0..7] = [9f,86,d0,81,88,4c,7d,65] XOR [d1,5d,6c,15,b0,f0,0a,08]
                     = [4e,db,bc,94,38,bc,77,6d]
fractalType: dragon
cReal:       0.946
cImaginary:  -1.114
baseHue:     168.0
satProfile:  pastel
harmony:     triadic
symmetry:    7
iterations:  345
zoom:        0.6235
```

### Vector 4: `"password"`
```
SHA-256:     5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
Fold XOR:    b[0..7] = [5e,88,48,98,da,28,04,71] XOR [2a,11,ef,72,1d,15,42,d8]
                     = [74,99,a7,ea,c7,3d,46,a9]
fractalType: flame
cReal:       0.624
cImaginary:  1.113
baseHue:     98.8
satProfile:  pastel
harmony:     analogous
symmetry:    7
iterations:  259
zoom:        0.7294
```

### Vector 5: `"fractal-hash"`
```
SHA-256:     3048337c6dd2af49966e24fefdfb305e21cae0615671f953601a1af6cc06b540
Fold XOR:    b[0..7] = [30,48,33,7c,6d,d2,af,49] XOR [60,1a,1a,f6,cc,06,b5,40]
                     = [50,52,29,8a,a1,d4,1a,09]
fractalType: julia
cReal:       -1.351
cImaginary:  0.529
baseHue:     36.7
satProfile:  vibrant
harmony:     triadic
symmetry:    7
iterations:  510
zoom:        1.0529
```

---

## 8. Security Considerations

- **Collision resistance** of Visual Fingerprints inherits from the underlying
  hash function (SHA-256). Finding two inputs that produce the same fractal
  is computationally equivalent to finding a SHA-256 collision.
- **Perceptual collision** (two different hashes that look "similar" to humans)
  is mitigated by the high-dimensional parameter space: fractal type, color,
  symmetry, iteration count, rotation, and viewport are all independently
  derived from different byte ranges.
- **Visual Fingerprints are NOT a replacement for cryptographic verification.**
  They are a supplementary tool for human-assisted comparison.

---

## 9. IANA Considerations

This document proposes registration of the following MIME type:

- **Type name:** image
- **Subtype name:** fractal-hash+png
- **Required parameters:** none
- **Encoding:** base64 or binary
- **Interoperability:** Standard PNG with fractal content generated per this RFC

---

## Appendix A: Reference Implementation

The reference implementation is the [fractal-hash](https://github.com/tyrenker/fractal-hash)
npm package (TypeScript, zero runtime dependencies).

```bash
npm install fractal-hash
```

```typescript
import { fractalHash } from 'fractal-hash';
const png = await fractalHash('hello', { format: 'png', size: 256 });
```

---

## Appendix B: Changelog

- **Draft 1 (2026-02-27):** Initial specification with 5 test vectors.
- **Draft 2 (2026-03-01):** Added Section 4.1 byte-folding step (XOR bytes 24–31 into 0–7) to guarantee perceptual distinctness for all bit positions. Recomputed all 5 test vectors.
