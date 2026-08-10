import encodeQR from 'qr';

export function reEncode(data: string, border: number): Uint8Array {
  return encodeQR(data, 'gif', { scale: 1, border: Math.max(1, border) });
}
