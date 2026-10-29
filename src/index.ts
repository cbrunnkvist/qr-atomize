import { readFile } from 'fs/promises';
import { decodeInput } from './decode-input.js';
import { reEncode } from './re-encode.js';

export interface AtomizeOpts {
  border?: number;
  format?: 'gif' | 'raw';
  text?: string;
}

export default function atomizeQr(input: Buffer | string, opts?: AtomizeOpts & { format?: 'gif' }): Promise<Buffer>;
export default function atomizeQr(input: Buffer | string, opts: AtomizeOpts & { format: 'raw' }): Promise<boolean[][]>;
export default function atomizeQr(input: Buffer | string, opts: AtomizeOpts): Promise<Buffer | boolean[][]>;
export default async function atomizeQr(input: Buffer | string, opts?: AtomizeOpts): Promise<Buffer | boolean[][]> {
  const border = Math.max(1, opts?.border ?? 2);
  const format = opts?.format ?? 'gif';
  const data = opts?.text !== undefined
    ? opts.text
    : await decodeInput(typeof input === 'string' ? await readFile(input) : input);
  const result = reEncode(data, border, format);
  return format === 'raw' ? result as boolean[][] : Buffer.from(result as Uint8Array);
}
