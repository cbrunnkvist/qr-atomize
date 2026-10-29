import encodeQR from 'qr';

export function reEncode(data: string, border: number, format: 'gif' | 'raw' = 'gif'): Uint8Array | boolean[][] {
  try {
    return format === 'raw' ? encodeQR(data, 'raw', { scale: 1, border, ecc: 'medium' }) : encodeQR(data, 'gif', { scale: 1, border, ecc: 'medium' });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'Capacity overflow') throw error;
    try {
      return format === 'raw' ? encodeQR(data, 'raw', { scale: 1, border, ecc: 'low' }) : encodeQR(data, 'gif', { scale: 1, border, ecc: 'low' });
    } catch (fallback) {
      if (fallback instanceof Error && fallback.message === 'Capacity overflow') {
        throw new Error('Payload exceeds QR capacity even with low error correction');
      }
      throw fallback;
    }
  }
}
