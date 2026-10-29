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

test('atomizes its own small output', async () => {
  const gif: Buffer = await atomizeQr('', { text: 'hello' });
  const raw: boolean[][] = await atomizeQr(gif, { format: 'raw' });
  assert.deepEqual(raw, encodeQR('hello', 'raw', { border: 2 }));
});

test('rejects invalid UTF-8', async () => {
  const gif = encodeQR('café', 'gif', { scale: 4, textEncoder: (s: string) => Uint8Array.from(s, c => c.charCodeAt(0)) });
  await assert.rejects(atomizeQr(Buffer.from(gif)), /invalid UTF-8/);
});

test('falls back to low correction for large payloads', async () => {
  const text = 'a'.repeat(2400);
  const gif = encodeQR(text, 'gif', { scale: 3, ecc: 'low' });
  assert.deepEqual(await atomizeQr(Buffer.from(gif), { format: 'raw' }), encodeQR(text, 'raw', { ecc: 'low', border: 2 }));
});

test('composites transparent backgrounds', async () => {
  const { Image } = await import('cross-image');
  const image = await Image.decode(encodeQR('transparent', 'gif', { scale: 4 }));
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i] === 255) image.data.fill(0, i, i + 4);
  }
  assert.deepEqual(await atomizeQr(Buffer.from(await image.encode('png')), { format: 'raw' }), encodeQR('transparent', 'raw', { border: 2 }));
});

test('CLI rejects invalid arguments without writing output', async () => {
  const { mkdtemp, readdir, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { spawnSync } = await import('node:child_process');
  const cwd = await mkdtemp(join(tmpdir(), 'qr-cli-test-'));
  try {
    for (const args of [ ['--text', 'hello', '--output'], ['--text', 'hello', '--bogus'], ['--text', 'hello', '--border', '2junk'], ['--text', 'hello', '--text', 'other'], ['one.png', 'two.png'] ]) {
      const result = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/qr-atomize.js', import.meta.url)), ...args], { cwd, encoding: 'utf8' });
      assert.equal(result.status, 1, JSON.stringify(args));
      assert.match(result.stderr, /Error:/);
      assert.deepEqual(await readdir(cwd), []);
    }
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('CLI honors help after other arguments without reading or writing files', async () => {
  const { mkdtemp, readdir, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { spawnSync } = await import('node:child_process');
  const cwd = await mkdtemp(join(tmpdir(), 'qr-help-test-'));
  try {
    for (const flag of ['--help', '-h']) {
      for (const args of [[], ['--text', 'hello'], ['missing.png'], ['--text', 'hello', 'missing.png'], ['--border', 'invalid']]) {
        const result = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/qr-atomize.js', import.meta.url)), ...args, flag], { cwd, encoding: 'utf8' });
        assert.equal(result.status, 0, JSON.stringify([...args, flag]));
        assert.match(result.stdout, /^Usage: qr-atomize/);
        assert.equal(result.stderr, '');
        assert.deepEqual(await readdir(cwd), []);
      }
    }
  } finally { await rm(cwd, { recursive: true, force: true }); }
});
