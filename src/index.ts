import decodeQR from 'qr/decode.js';
import _jsQR from 'jsqr';
import { decodeInput } from './decode-input.js';
import { reEncode } from './re-encode.js';
import type { Image as QrImage } from 'qr';

type JsQR = (data: Uint8ClampedArray, width: number, height: number, opts?: { inversionAttempts?: string }) => { data: string } | null;
// jsQR is a UMD bundle; with ESM interop the default lands one level deep.
const jsQR: JsQR = ((_jsQR as unknown as { default?: JsQR }).default ?? _jsQR) as JsQR;

export type { OutputFormat } from './re-encode.js';

export interface AtomizeOpts {
  /** Quiet zone in modules. Default: 2 */
  border?: number;
  /** Output format: 'png' (1-bit, default) or 'gif' */
  format?: 'png' | 'gif';
  /**
   * Swap the output polarity relative to the input.
   * - false/undefined (default): output matches input polarity
   * - true: flip black ↔ white
   */
  invert?: boolean;
}

/**
 * Attempt to decode a QR image with jsQR as a fallback.
 * jsQR uses a different detection pipeline (4-corner perspective,
 * its own binariser) so it can succeed where the `qr` library fails.
 */
function decodeWithJsQr(image: QrImage): string | undefined {
  // jsQR expects Uint8ClampedArray RGBA data
  const raw = image.data;
  const clamped = raw instanceof Uint8ClampedArray
    ? raw
    : raw instanceof Uint8Array
      ? new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength)
      : new Uint8ClampedArray(raw);
  const result = jsQR(clamped, image.width, image.height, { inversionAttempts: 'attemptBoth' });
  return result?.data;
}

/**
 * Detect if the input image has a dark background (inverted QR).
 * Samples the four corners — if the average brightness is below 128,
 * the background is dark and the output should be inverted.
 */
function hasDarkBackground(image: QrImage): boolean {
  const { width, height, data } = image;
  const bpp = data instanceof Uint8Array && !(data instanceof Array)
    ? data.length / (width * height)
    : 4;
  const brightness = (x: number, y: number) => {
    const i = (y * width + x) * bpp;
    return ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
  };
  const avg = (
    brightness(0, 0) +
    brightness(width - 1, 0) +
    brightness(0, height - 1) +
    brightness(width - 1, height - 1)
  ) / 4;
  return avg < 128;
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

  let data: string;
  try {
    data = decodeQR(image);
  } catch {
    // Primary decoder failed — fall back to jsQR
    const fallback = decodeWithJsQr(image);
    if (fallback === undefined) {
      // Re-throw the original error if jsQR also couldn't decode
      data = decodeQR(image);
    } else {
      data = fallback;
    }
  }

  const shouldInvert = hasDarkBackground(image) !== (opts?.invert ?? false);
  const out = reEncode(data, { border: opts?.border, format: opts?.format, invert: shouldInvert });
  return Buffer.from(out);
}

export { decodeInput } from './decode-input.js';
export { reEncode } from './re-encode.js';
