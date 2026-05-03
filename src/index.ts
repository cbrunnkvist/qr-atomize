import decodeQR from 'qr/decode.js';
import { decodeInput } from './decode-input.js';
import { reEncode } from './re-encode.js';

export type { OutputFormat } from './re-encode.js';

export interface AtomizeOpts {
  /** Quiet zone in modules. Default: 2 */
  border?: number;
  /** Output format: 'png' (1-bit, default) or 'gif' */
  format?: 'png' | 'gif';
}

/**
 * Decode a QR code image and re-render it at 1 pixel per module.
 *
 * @param input - Buffer or file path to a QR code image (PNG, JPEG, GIF, WebP, BMP, TIFF, ICO)
 * @param opts  - Options
 * @returns Buffer of the atomized QR code (1 pixel per module)
 */
export default async function atomizeQr(input: Buffer | string, opts?: AtomizeOpts): Promise<Buffer> {
  const image = await decodeInput(input);
  const data = decodeQR(image);
  const out = reEncode(data, { border: opts?.border, format: opts?.format });
  return Buffer.from(out);
}

export { decodeInput } from './decode-input.js';
export { reEncode } from './re-encode.js';
