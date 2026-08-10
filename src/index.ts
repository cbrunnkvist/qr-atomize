import { readFile } from 'fs/promises';
import { decodeInput } from './decode-input.js';
import { reEncode } from './re-encode.js';

export interface AtomizeOpts {
  border?: number;
  format?: 'gif' | 'raw';
  text?: string;
}

export default async function atomizeQr(
  input: Buffer | string,
  opts?: AtomizeOpts
): Promise<Buffer | boolean[][]> {
  const border = Math.max(1, opts?.border ?? 2);
  const format = opts?.format ?? 'gif';

  if (opts?.text !== undefined) {
    const { default: encodeQR } = await import('qr');
    if (format === 'raw') {
      return encodeQR(opts.text, 'raw', { scale: 1, border });
    }
    return Buffer.from(encodeQR(opts.text, 'gif', { scale: 1, border }));
  }

  const buf = typeof input === 'string' ? await readFile(input) : input;
  const data = await decodeInput(buf);

  if (format === 'raw') {
    const { default: encodeQR } = await import('qr');
    return encodeQR(data, 'raw', { scale: 1, border });
  }

  return Buffer.from(reEncode(data, border));
}
