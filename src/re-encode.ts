import encodeQR, { Bitmap } from 'qr';
import { encode as encodePng } from 'fast-png';

export type OutputFormat = 'png' | 'gif' | 'raw';
export interface ReEncodeOpts {
  border?: number;
  format?: OutputFormat;
  invert?: boolean;
}

export function reEncode(data: string, opts?: ReEncodeOpts & { format?: 'png' | 'gif' }): Uint8Array;
export function reEncode(data: string, opts: ReEncodeOpts & { format: 'raw' }): boolean[][];
export function reEncode(data: string, opts: ReEncodeOpts): Uint8Array | boolean[][];
export function reEncode(data: string, opts: ReEncodeOpts = {}): Uint8Array | boolean[][] {
  const border = Math.max(1, opts.border ?? 2);
  let raw: boolean[][];
  try {
    raw = encodeQR(data, 'raw', { scale: 1, border, ecc: 'medium' });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'Capacity overflow') throw error;
    try {
      raw = encodeQR(data, 'raw', { scale: 1, border, ecc: 'low' });
    } catch (fallback) {
      if (fallback instanceof Error && fallback.message === 'Capacity overflow') {
        throw new Error('Payload exceeds QR capacity even with low error correction');
      }
      throw fallback;
    }
  }
  if (opts.invert) raw = raw.map(row => row.map(dark => !dark));
  if (opts.format === 'raw') return raw;
  if (opts.format === 'gif') return new Bitmap(raw.length, raw).toGIF();

  const width = raw.length;
  const stride = Math.ceil(width / 8);
  const packed = new Uint8Array(stride * width);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      if (!raw[y][x]) packed[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return encodePng({ width, height: width, data: packed, depth: 1, channels: 1 });
}
