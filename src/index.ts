import { readFile } from 'fs/promises';
import { decodeInput, readQr } from './decode-input.js';
import { reEncode } from './re-encode.js';

export interface AtomizeOpts {
  border?: number;
  format?: 'png' | 'gif' | 'raw';
  text?: string;
  invert?: boolean;
}

export default function atomizeQr(input: Buffer | string, opts?: AtomizeOpts & { format?: 'png' | 'gif' }): Promise<Buffer>;
export default function atomizeQr(input: Buffer | string, opts: AtomizeOpts & { format: 'raw' }): Promise<boolean[][]>;
export default function atomizeQr(input: Buffer | string, opts: AtomizeOpts): Promise<Buffer | boolean[][]>;
export default async function atomizeQr(input: Buffer | string, opts?: AtomizeOpts): Promise<Buffer | boolean[][]> {
  const border = Math.max(1, opts?.border ?? 2);
  const format = opts?.format ?? 'png';
  let data = opts?.text;
  let inverted = false;
  if (data === undefined) {
    const image = await decodeInput(typeof input === 'string' ? await readFile(input) : input);
    const corners = [0, image.width - 1, (image.height - 1) * image.width, image.width * image.height - 1];
    inverted = corners.reduce((sum, pixel) => sum + image.data[pixel * 4] + image.data[pixel * 4 + 1] + image.data[pixel * 4 + 2], 0) / 12 < 128;
    data = readQr(image);
  }
  const result = reEncode(data, { border, format, invert: inverted !== (opts?.invert ?? false) });
  return format === 'raw' ? result as boolean[][] : Buffer.from(result as Uint8Array);
}

export { decodeInput } from './decode-input.js';
export { reEncode } from './re-encode.js';
export type { OutputFormat, ReEncodeOpts } from './re-encode.js';
