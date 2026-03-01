import { deflateSync } from 'node:zlib';
import { FractalConfig, FractalHashOptions } from '../core/types.js';
import { renderFractal } from '../fractals/index.js';

// ---------------------------------------------------------------------------
// CRC-32 table (built once at module load)
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// PNG chunk helpers
// ---------------------------------------------------------------------------

function createChunk(type: string, data: Buffer): Buffer {
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const checksum = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(checksum, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createIHDR(width: number, height: number): Buffer {
  const data = Buffer.allocUnsafe(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8; // bit depth
  data[9] = 6; // color type: RGBA
  data[10] = 0; // compression: deflate
  data[11] = 0; // filter method
  data[12] = 0; // interlace: none
  return createChunk('IHDR', data);
}

function createIDAT(width: number, height: number, pixels: Uint8ClampedArray): Buffer {
  // Each scanline: 1 filter byte (0 = None) + width*4 RGBA bytes
  const rowStride = width * 4;
  const rawData = Buffer.allocUnsafe(height * (rowStride + 1));
  for (let y = 0; y < height; y++) {
    const rowBase = y * (rowStride + 1);
    rawData[rowBase] = 0; // filter type: None
    const pixBase = y * rowStride;
    for (let x = 0; x < rowStride; x++) {
      rawData[rowBase + 1 + x] = pixels[pixBase + x];
    }
  }
  const compressed = deflateSync(rawData);
  return createChunk('IDAT', compressed);
}

function createIEND(): Buffer {
  return createChunk('IEND', Buffer.alloc(0));
}

// ---------------------------------------------------------------------------
// PNG signature
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function encodePng(width: number, height: number, pixels: Uint8ClampedArray): Buffer {
  return Buffer.concat([
    PNG_SIGNATURE,
    createIHDR(width, height),
    createIDAT(width, height, pixels),
    createIEND(),
  ]);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Render fractal to a PNG Buffer. Node.js only (uses node:zlib). */
export async function renderToPng(config: FractalConfig, options: FractalHashOptions): Promise<Buffer> {
  const size = options.size ?? 256;
  const { pixels } = renderFractal(config, size, size);
  return encodePng(size, size, pixels);
}

/** Render fractal and save to a PNG file. Node.js only. */
export async function renderToPngFile(
  config: FractalConfig,
  options: FractalHashOptions,
  outputPath: string,
): Promise<void> {
  const buf = await renderToPng(config, options);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, buf);
}
