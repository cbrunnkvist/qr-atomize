import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import encodeQR from 'qr';
import { Bitmap } from 'qr';
import { decode as decodePng } from 'fast-png';
import { Image } from 'cross-image';
import atomizeQr from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => join(__dirname, 'fixtures', name);

function getModuleGrid(text, border) {
  const raw = encodeQR(text, 'raw', { scale: 1, border });
  return new Bitmap({ width: raw[0].length, height: raw.length }, raw);
}

function assertPngPixelsMatchGrid(pngData, expected) {
  const { width, height, data } = pngData;
  const rowBytes = Math.ceil(width / 8);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byteIdx = y * rowBytes + (x >> 3);
      const bitIdx = 7 - (x & 7);
      const pixelBlack = ((data[byteIdx] >> bitIdx) & 1) === 1;
      const expectedBlack = expected.get(x, y);
      assert.equal(pixelBlack, expectedBlack, `Pixel mismatch at (${x},${y})`);
    }
  }
}

async function gifToPixels(buf) {
  const img = await Image.decode(new Uint8Array(buf));
  return { width: img.width, height: img.height, data: img.data };
}

// ── Valid inputs from fixtures ────────────────────────────────────────

describe('valid QR fixtures', () => {
  const EXPECTED_TEXT = 'https://example.com';
  const EXPECTED_GRID = getModuleGrid(EXPECTED_TEXT, 2);

  it('atomizes valid-qr.gif', async () => {
    const result = await atomizeQr(readFileSync(fixture('valid-qr.gif')));
    const png = decodePng(result);
    assert.equal(png.width, EXPECTED_GRID.width);
    assert.equal(png.height, EXPECTED_GRID.height);
    assert.equal(png.depth, 1);
    assertPngPixelsMatchGrid(png, EXPECTED_GRID);
  });

  it('atomizes valid-qr.png', async () => {
    const result = await atomizeQr(readFileSync(fixture('valid-qr.png')));
    const png = decodePng(result);
    assert.equal(png.width, EXPECTED_GRID.width);
    assert.equal(png.height, EXPECTED_GRID.height);
    assert.equal(png.depth, 1);
    assertPngPixelsMatchGrid(png, EXPECTED_GRID);
  });

  it('atomizes valid-qr.jpg', async () => {
    const result = await atomizeQr(readFileSync(fixture('valid-qr.jpg')));
    const png = decodePng(result);
    assert.equal(png.width, EXPECTED_GRID.width);
    assert.equal(png.height, EXPECTED_GRID.height);
    assert.equal(png.depth, 1);
    assertPngPixelsMatchGrid(png, EXPECTED_GRID);
  });

  it('atomizes valid-qr.bmp', async () => {
    const result = await atomizeQr(readFileSync(fixture('valid-qr.bmp')));
    const png = decodePng(result);
    assert.equal(png.width, EXPECTED_GRID.width);
    assert.equal(png.height, EXPECTED_GRID.height);
    assert.equal(png.depth, 1);
    assertPngPixelsMatchGrid(png, EXPECTED_GRID);
  });

  it('accepts a file path instead of a buffer', async () => {
    const result = await atomizeQr(fixture('valid-qr.gif'));
    assert.ok(Buffer.isBuffer(result));
    assert.ok(result.length > 0);
  });
});

// ── WebP with embedded logo ──────────────────────────────────────────

describe('WebP with embedded logo', () => {
  it('decodes and atomizes url-with-logo.webp despite logo overlay', async () => {
    const result = await atomizeQr(readFileSync(fixture('url-with-logo.webp')));
    const png = decodePng(result);

    assert.equal(png.depth, 1);
    assert.ok(png.width > 0 && png.height > 0, 'should have non-zero dimensions');

    const grid = getModuleGrid('ibm.com', 2);
    assert.equal(png.width, grid.width, 'width should match ibm.com QR version');
    assert.equal(png.height, grid.height, 'height should match ibm.com QR version');
  });

  it('produces pixel-accurate output for logo QR', async () => {
    const result = await atomizeQr(readFileSync(fixture('url-with-logo.webp')));
    const png = decodePng(result);
    const grid = getModuleGrid('ibm.com', 2);
    assertPngPixelsMatchGrid(png, grid);
  });

  it('atomized WebP with logo is much smaller than input', async () => {
    const input = readFileSync(fixture('url-with-logo.webp'));
    const output = await atomizeQr(input);
    assert.ok(output.length < input.length / 5,
      `Output (${output.length}) should be <20% of input (${input.length})`);
  });
});

// ── Output format options ─────────────────────────────────────────────

describe('output formats', () => {
  it('default output is 1-bit PNG', async () => {
    const result = await atomizeQr(readFileSync(fixture('valid-qr.gif')));
    assert.equal(result[0], 0x89);
    const png = decodePng(result);
    assert.equal(png.depth, 1);
  });

  it('format: gif produces a valid GIF', async () => {
    const result = await atomizeQr(readFileSync(fixture('valid-qr.gif')), { format: 'gif' });
    assert.equal(result[0], 0x47); // 'G'
    const { width, height } = await gifToPixels(result);
    const grid = getModuleGrid('https://example.com', 2);
    assert.equal(width, grid.width);
    assert.equal(height, grid.height);
  });

  it('border option affects dimensions', async () => {
    const result = await atomizeQr(readFileSync(fixture('valid-qr.gif')), { border: 4 });
    const png = decodePng(result);
    assert.equal(png.width, getModuleGrid('https://example.com', 4).width);
  });
});

// ── GIGO: invalid inputs must throw, not produce garbage ─────────────

describe('invalid inputs (GIGO rejection)', () => {
  it('throws on damaged QR (all finder patterns corrupted)', async () => {
    await assert.rejects(
      () => atomizeQr(readFileSync(fixture('damaged-qr-all-finders.png'))),
      /Finder/
    );
  });

  it('throws on solid white image (no QR)', async () => {
    await assert.rejects(
      () => atomizeQr(readFileSync(fixture('not-a-qr.png'))),
      /Finder/
    );
  });

  it('throws on random noise image', async () => {
    await assert.rejects(
      () => atomizeQr(readFileSync(fixture('noise.png'))),
      /Finder/
    );
  });

  it('throws on truncated PNG', async () => {
    await assert.rejects(
      () => atomizeQr(readFileSync(fixture('truncated-qr.png'))),
      Error
    );
  });

  it('throws on empty file', async () => {
    await assert.rejects(
      () => atomizeQr(readFileSync(fixture('empty.png'))),
      Error
    );
  });

  it('throws on non-image file with .png extension', async () => {
    await assert.rejects(
      () => atomizeQr(readFileSync(fixture('fake.png'))),
      Error
    );
  });
});

// ── Size comparison ───────────────────────────────────────────────────

describe('output size', () => {
  it('1-bit PNG is smaller than GIF output', async () => {
    const input = readFileSync(fixture('valid-qr.gif'));
    const png = await atomizeQr(input, { format: 'png' });
    const gif = await atomizeQr(input, { format: 'gif' });
    assert.ok(png.length < gif.length,
      `PNG (${png.length}) should be smaller than GIF (${gif.length})`);
  });

  it('output is dramatically smaller than input', async () => {
    const input = readFileSync(fixture('valid-qr.gif'));
    const output = await atomizeQr(input);
    assert.ok(output.length < input.length / 10,
      `Output (${output.length}) should be <10% of input (${input.length})`);
  });
});
