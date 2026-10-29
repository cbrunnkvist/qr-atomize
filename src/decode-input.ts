import { decode as decodePng } from 'fast-png';
import { Image } from 'cross-image';
import decodeQR from 'qr/decode.js';
import jsQrModule, { type QRCode } from 'jsqr';
type JsQr = (data: Uint8ClampedArray, width: number, height: number, opts: { inversionAttempts: 'attemptBoth' }) => QRCode | null;
const jsQR = ((jsQrModule as unknown as { default?: JsQr }).default ?? jsQrModule) as JsQr;
import { decode as decodeWebp } from '@cwasm/webp';
import type { Image as QrImage } from 'qr';

class UnsupportedEncodingError extends Error {}

export async function decodeInput(input: Buffer | string): Promise<QrImage> {
  const buf = typeof input === 'string'
    ? await (await import('fs/promises')).readFile(input)
    : input;

  let img: Image;
  try {
    // cross-image misreads packed 1-bit grayscale rows; unpack them explicitly.
    if (buf.length >= 26 && buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buf[24] === 1 && buf[25] === 0) {
      const png = decodePng(buf);
      const rgba = new Uint8Array(png.width * png.height * 4);
      const stride = Math.ceil(png.width / 8);
      for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
          const i = (y * png.width + x) * 4;
          const white = (png.data[y * stride + (x >> 3)] & (0x80 >> (x & 7))) !== 0;
          rgba[i] = rgba[i + 1] = rgba[i + 2] = white ? 255 : 0;
          rgba[i + 3] = 255;
        }
      }
      img = Image.fromRGBA(png.width, png.height, rgba);
    } else {
      img = await Image.decode(new Uint8Array(buf));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/WebP|VP8L/.test(message)) throw new Error('Input does not appear to contain a decodable QR code', { cause: error });
    const decoded = decodeWebp(new Uint8Array(buf));
    img = Image.fromRGBA(decoded.width, decoded.height, new Uint8Array(decoded.data));
  }

  for (let i = 0; i < img.data.length; i += 4) {
    const alpha = img.data[i + 3] / 255;
    for (let channel = 0; channel < 3; channel++) {
      img.data[i + channel] = Math.round(img.data[i + channel] * alpha + 255 * (1 - alpha));
    }
    img.data[i + 3] = 255;
  }
  const factor = Math.ceil(40 / Math.min(img.width, img.height));
  if (factor > 1) img.resize({ width: img.width * factor, height: img.height * factor, method: 'nearest' });
  return { width: img.width, height: img.height, data: img.data };
}

function decodeUtf8(bytes: Uint8Array, eci?: number): string {
  if (eci !== undefined && eci !== 26) throw new UnsupportedEncodingError('Unsupported QR encoding: only UTF-8 is supported');
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new UnsupportedEncodingError('Unsupported QR encoding: invalid UTF-8 payload'); }
}

export function readQr(image: QrImage): string {
  try {
    return decodeQR(image, { textDecoder: decodeUtf8 });
  } catch (error) {
    if (error instanceof UnsupportedEncodingError) throw error;
    const fallback = jsQR(new Uint8ClampedArray(image.data), image.width, image.height, { inversionAttempts: 'attemptBoth' });
    if (!fallback) throw new Error('Input does not appear to contain a decodable QR code', { cause: error });
    return fallback.chunks.map(chunk => {
      if (chunk.type === 'byte' && 'bytes' in chunk) return decodeUtf8(Uint8Array.from(chunk.bytes));
      if (chunk.type === 'eci' && 'assignmentNumber' in chunk) {
        if (chunk.assignmentNumber !== 26) throw new UnsupportedEncodingError('Unsupported QR encoding: only UTF-8 is supported');
        return '';
      }
      if (chunk.type === 'kanji') throw new UnsupportedEncodingError('Unsupported QR encoding: Kanji');
      if ('text' in chunk) return chunk.text;
      throw new UnsupportedEncodingError('Unsupported QR segment');
    }).join('');
  }
}
