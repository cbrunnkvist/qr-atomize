import encodeQR from 'qr';
import { encode as encodePng } from 'fast-png';

export type OutputFormat = 'png' | 'gif';

export interface ReEncodeOpts {
  border?: number;
  format?: OutputFormat;
}

export function reEncode(data: string, opts?: ReEncodeOpts): Uint8Array {
  const border = opts?.border ?? 2;
  const format = opts?.format ?? 'png';

  if (format === 'gif') {
    return encodeQR(data, 'gif', { scale: 1, border });
  }

  const raw = encodeQR(data, 'raw', { scale: 1, border });
  const h = raw.length;
  const w = raw[0].length;
  const rowBytes = Math.ceil(w / 8);
  const packed = new Uint8Array(rowBytes * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (raw[y][x]) {
        packed[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return encodePng({ width: w, height: h, data: packed, depth: 1, channels: 1 });
}
