import { Image } from 'cross-image';
import decodeQR from 'qr/decode.js';
import type { Image as QrImage } from 'qr';

class UnsupportedEncodingError extends Error {}

export async function decodeInput(input: Buffer | string): Promise<string> {
  const buf = typeof input === 'string'
    ? await (await import('fs/promises')).readFile(input)
    : input;

  let img: Image;
  try {
    img = await Image.decode(new Uint8Array(buf));
  } catch (error) {
    if (error instanceof UnsupportedEncodingError) throw error;
    throw new Error('Input does not appear to contain a decodable QR code');
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
  const qrImage: QrImage = { width: img.width, height: img.height, data: img.data };
  try {
    return decodeQR(qrImage, { textDecoder(bytes: Uint8Array, eci?: number) {
      if (eci !== undefined && eci !== 26) throw new UnsupportedEncodingError('Unsupported QR encoding: only UTF-8 is supported');
      try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
      catch { throw new UnsupportedEncodingError('Unsupported QR encoding: invalid UTF-8 payload'); }
    } });
  } catch (error) {
    if (error instanceof UnsupportedEncodingError) throw error;
    throw new Error('Input does not appear to contain a decodable QR code');
  }
}
