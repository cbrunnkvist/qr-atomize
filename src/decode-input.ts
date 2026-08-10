import { Image } from 'cross-image';
import decodeQR from 'qr/decode.js';
import type { Image as QrImage } from 'qr';

export async function decodeInput(input: Buffer | string): Promise<string> {
  const buf = typeof input === 'string'
    ? await (await import('fs/promises')).readFile(input)
    : input;

  let img: Image;
  try {
    img = await Image.decode(new Uint8Array(buf));
  } catch {
    throw new Error('Input does not appear to contain a decodable QR code');
  }

  const qrImage: QrImage = { width: img.width, height: img.height, data: img.data };
  try {
    return decodeQR(qrImage);
  } catch {
    throw new Error('Input does not appear to contain a decodable QR code');
  }
}
