import { readFileSync } from 'node:fs';
import { Image } from 'cross-image';
import { decode as decodeWebp } from '@cwasm/webp';
import type { Image as QrImage } from 'qr';

export async function decodeInput(input: Buffer | string): Promise<QrImage> {
  const buf = typeof input === 'string' ? readFileSync(input) : input;
  const bytes = new Uint8Array(buf);

  try {
    const img = await Image.decode(bytes);
    return { width: img.width, height: img.height, data: img.data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('WebP') || msg.includes('VP8L')) {
      const img = decodeWebp(bytes);
      return { width: img.width, height: img.height, data: new Uint8Array(img.data) };
    }
    throw err;
  }
}
