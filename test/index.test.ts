import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import encodeQR from 'qr';
import atomizeQr from '../src/index.js';

test('round-trip: encode → atomize → compare raw', async () => {
  const payload = 'https://example.com/qr-atomize-test';
  const gif = encodeQR(payload, 'gif', { scale: 4, border: 2 });

  const result = await atomizeQr(Buffer.from(gif), { border: 2, format: 'raw' });
  const expected = encodeQR(payload, 'raw', { scale: 1, border: 2 });
  assert.deepEqual(result, expected);
});

test('round-trip with border=1', async () => {
  const payload = 'Hello World';
  const gif = encodeQR(payload, 'gif', { scale: 4, border: 2 });

  const result = await atomizeQr(Buffer.from(gif), { border: 1, format: 'raw' });
  const expected = encodeQR(payload, 'raw', { scale: 1, border: 1 });
  assert.deepEqual(result, expected);
});

test('border=0 clamps to 1', async () => {
  const payload = 'border-clamp';
  const gif = encodeQR(payload, 'gif', { scale: 4, border: 2 });

  const result = await atomizeQr(Buffer.from(gif), { border: 0, format: 'raw' });
  const expected = encodeQR(payload, 'raw', { scale: 1, border: 1 });
  assert.deepEqual(result, expected);
});

test('gif output is a Buffer', async () => {
  const payload = 'gif-output';
  const gif = encodeQR(payload, 'gif', { scale: 4, border: 2 });

  const result = await atomizeQr(Buffer.from(gif), { border: 2 });
  assert.ok(Buffer.isBuffer(result), 'result should be a Buffer');
  assert.ok(result.length > 0, 'result should not be empty');
});

test('output dimensions match raw', async () => {
  const payload = 'dimensions';
  const border = 3;
  const gif = encodeQR(payload, 'gif', { scale: 4, border: 2 });

  const result = (await atomizeQr(Buffer.from(gif), { border })) as Buffer;
  const { Image } = await import('cross-image');
  const img = await Image.decode(new Uint8Array(result));

  const raw = encodeQR(payload, 'raw', { border });
  assert.equal(img.width, raw.length);
  assert.equal(img.height, raw.length);
});

test('throws on non-QR input', async () => {
  const notQr = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await assert.rejects(() => atomizeQr(notQr), /decodable QR code/);
});

test('text mode: gif output', async () => {
  const result = await atomizeQr('', { text: 'https://example.com' });
  assert.ok(Buffer.isBuffer(result), 'result should be a Buffer');
  assert.ok(result.length > 0, 'result should not be empty');
});

test('text mode: raw output', async () => {
  const result = await atomizeQr('', { text: 'https://example.com', format: 'raw' });
  assert.ok(Array.isArray(result), 'result should be an array');
  assert.ok((result as boolean[][]).length > 0, 'result should not be empty');
  assert.ok(Array.isArray((result as boolean[][])[0]), 'rows should be arrays');
});

test('text mode: UTF-8 input', async () => {
  const result = await atomizeQr('', { text: 'Hello 🌍 你好' });
  assert.ok(Buffer.isBuffer(result), 'result should be a Buffer');
  assert.ok(result.length > 0, 'result should not be empty');
});

test('text mode: dimensions match raw', async () => {
  const text = 'dimension-check';
  const border = 3;
  const result = (await atomizeQr('', { text, border })) as Buffer;
  const { Image } = await import('cross-image');
  const img = await Image.decode(new Uint8Array(result));

  const raw = encodeQR(text, 'raw', { border });
  assert.equal(img.width, raw.length);
  assert.equal(img.height, raw.length);
});
