/**
 * Normalizes any hash-like input string to exactly 32 bytes.
 *
 * Detection order:
 *  1. SSH fingerprint prefix stripped → base64 decode
 *  2. Colon-separated hex (aa:bb:cc:…) → strip colons → hex decode
 *  3. 0x-prefixed hex → strip prefix → hex decode
 *  4. 64-char hex string → decode directly
 *  5. Base64 (padding optional) → decode
 *  6. Anything else → SHA-256 hash
 *
 * Always returns exactly 32 bytes.
 */

/** Returns true if every character of s is a valid hex digit */
function isHex(s: string): boolean {
  return /^[0-9a-fA-F]+$/.test(s);
}

/** Decode a hex string to Uint8Array */
function hexDecode(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Decode a base64 string (with or without padding) to Uint8Array */
function base64Decode(b64: string): Uint8Array {
  // Restore padding if needed
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Returns true if s looks like valid base64 */
function isBase64(s: string): boolean {
  return /^[A-Za-z0-9+/\-_]+=*$/.test(s);
}

/** SHA-256 a string using Web Crypto API (async, works in browser and Node 18+) */
async function sha256(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  } else {
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(data).digest();
    return new Uint8Array(hash);
  }
}

/** SHA-256 a string synchronously using Node's built-in crypto */
function sha256Sync(input: string): Uint8Array {
  // Dynamic import not available synchronously; use node:crypto directly
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('node:crypto') as typeof import('node:crypto');
  const hash = nodeCrypto.createHash('sha256').update(input, 'utf8').digest();
  return new Uint8Array(hash);
}

/**
 * Detect and decode the input to raw bytes, or return null if unrecognized.
 * Does NOT hash — only decodes known formats.
 */
function tryDecode(input: string): Uint8Array | null {
  // 1. SSH fingerprint: "SHA256:..." or "sha256:..." or "MD5:..." etc.
  const sshMatch = /^(?:SHA256|sha256|MD5|md5):(.+)$/.exec(input);
  if (sshMatch) {
    const payload = sshMatch[1];
    if (isBase64(payload)) {
      try {
        return base64Decode(payload);
      } catch {
        // fall through
      }
    }
  }

  // 2. Colon-separated hex: "aa:bb:cc:dd:..."
  if (/^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2})+$/.test(input)) {
    const stripped = input.replace(/:/g, '');
    if (isHex(stripped) && stripped.length % 2 === 0) {
      return hexDecode(stripped);
    }
  }

  // 3. 0x-prefixed hex
  if (/^0x[0-9a-fA-F]+$/i.test(input)) {
    const stripped = input.slice(2);
    if (stripped.length % 2 === 0) {
      return hexDecode(stripped);
    }
  }

  // 4. Pure hex string (must be even length, at least 64 chars for 32 bytes)
  const noSpace = input.replace(/\s/g, '');
  if (noSpace.length >= 64 && noSpace.length % 2 === 0 && isHex(noSpace)) {
    return hexDecode(noSpace.slice(0, 64));
  }

  // 5. Base64 (43–88 chars decodes to 32–66 bytes; accept if ≥ 32 bytes decoded)
  if (input.length >= 43 && isBase64(input)) {
    try {
      const decoded = base64Decode(input);
      if (decoded.length >= 32) {
        return decoded;
      }
    } catch {
      // fall through
    }
  }

  return null;
}

/** Ensure output is exactly 32 bytes (truncate or zero-pad) */
function ensure32(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 32) return bytes;
  const out = new Uint8Array(32);
  out.set(bytes.subarray(0, Math.min(bytes.length, 32)));
  return out;
}

/**
 * Normalize any input string to exactly 32 bytes (async).
 * Falls back to SHA-256 for unrecognized formats.
 */
export async function normalize(input: string): Promise<Uint8Array> {
  const decoded = tryDecode(input);
  if (decoded !== null) {
    return ensure32(decoded);
  }
  return sha256(input);
}

/**
 * Synchronous version — for CLI use and environments without async context.
 * Uses Node's built-in crypto module.
 */
export function normalizeSync(input: string): Uint8Array {
  const decoded = tryDecode(input);
  if (decoded !== null) {
    return ensure32(decoded);
  }
  return sha256Sync(input);
}
