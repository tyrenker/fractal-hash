import { describe, it, expect } from 'vitest';
import { normalize, normalizeSync } from '../src/core/normalizer.js';

const KNOWN_SHA256_HEX = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const KNOWN_SSH_FP = 'SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8';

describe('normalize (async)', () => {
  it('always returns exactly 32 bytes', async () => {
    const result = await normalize('hello world');
    expect(result.byteLength).toBe(32);
  });

  it('empty string returns 32 bytes (SHA-256 of "")', async () => {
    const result = await normalize('');
    expect(result.byteLength).toBe(32);
    // e3b0c442... is SHA-256 of empty string
    expect(result[0]).toBe(0xe3);
    expect(result[1]).toBe(0xb0);
  });

  it('64-char hex string is decoded directly', async () => {
    const result = await normalize(KNOWN_SHA256_HEX);
    expect(result.byteLength).toBe(32);
    expect(result[0]).toBe(0xe3);
    expect(result[1]).toBe(0xb0);
  });

  it('colon-separated hex is decoded correctly', async () => {
    const colonHex = 'e3:b0:c4:42:98:fc:1c:14:9a:fb:f4:c8:99:6f:b9:24:27:ae:41:e4:64:9b:93:4c:a4:95:99:1b:78:52:b8:55';
    const result = await normalize(colonHex);
    expect(result.byteLength).toBe(32);
    expect(result[0]).toBe(0xe3);
    expect(result[1]).toBe(0xb0);
  });

  it('SSH fingerprint format is decoded correctly', async () => {
    const result = await normalize(KNOWN_SSH_FP);
    expect(result.byteLength).toBe(32);
  });

  it('arbitrary string is SHA-256 hashed', async () => {
    const result = await normalize('hello');
    expect(result.byteLength).toBe(32);
    // SHA-256("hello") starts with 2c:f2:4d:ba
    expect(result[0]).toBe(0x2c);
    expect(result[1]).toBe(0xf2);
  });

  it('same input always produces same output (determinism)', async () => {
    const a = await normalize('test input');
    const b = await normalize('test input');
    expect(a).toEqual(b);
  });

  it('different inputs produce different outputs', async () => {
    const a = await normalize('input-a');
    const b = await normalize('input-b');
    expect(a).not.toEqual(b);
  });

  it('0x-prefixed hex is decoded correctly', async () => {
    const result = await normalize('0x' + KNOWN_SHA256_HEX);
    expect(result.byteLength).toBe(32);
    expect(result[0]).toBe(0xe3);
  });
});

describe('normalizeSync', () => {
  it('always returns exactly 32 bytes', () => {
    const result = normalizeSync('hello world');
    expect(result.byteLength).toBe(32);
  });

  it('matches async normalize for arbitrary strings', async () => {
    const input = 'sync vs async test';
    const syncResult = normalizeSync(input);
    const asyncResult = await normalize(input);
    expect(syncResult).toEqual(asyncResult);
  });

  it('same input always produces same output (determinism)', () => {
    const a = normalizeSync('test input');
    const b = normalizeSync('test input');
    expect(a).toEqual(b);
  });

  it('decodes 64-char hex the same as async', async () => {
    const syncResult = normalizeSync(KNOWN_SHA256_HEX);
    const asyncResult = await normalize(KNOWN_SHA256_HEX);
    expect(syncResult).toEqual(asyncResult);
  });
});
