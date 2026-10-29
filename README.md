# qr-atomize

Atomize any QR code image — 1 pixel per module.

Takes a QR code image (PNG, JPEG, GIF, WebP, BMP) and returns the same QR code re-rendered at **1 pixel per module** (plus a configurable quiet zone). The default output is a compact 1-bit PNG; GIF and raw matrices are also available.

## Install

```bash
npm install qr-atomize
```

## Usage

### API

```ts
import atomizeQr from 'qr-atomize';

// From file path
const png = await atomizeQr('qrcode.png');

// From buffer
const png = await atomizeQr(buffer);

// With options
const png = await atomizeQr('qrcode.png', { border: 4 });

// Raw 2D boolean array
const raw = await atomizeQr('qrcode.png', { format: 'raw' });
```

### CLI

```bash
npx qr-atomize input.png -o output.png
npx qr-atomize input.jpg --border 4
npx qr-atomize input.gif --quiet
```

## API

### `atomizeQr(input, opts?)`

**Parameters:**

- `input` — `Buffer | string` — Image buffer or file path
- `opts.border` — `number` — Quiet zone in modules (default: 2, minimum: 1)
- `opts.format` — `'png' | 'gif' | 'raw'` — Output format (default: `'png'`)

**Returns:** `Promise<Buffer>` (PNG/GIF) or `Promise<boolean[][]>` (raw)

## How it works

1. **Decode** the input image using `cross-image` (pure JS, no native deps)
2. **Read** the QR code data using `qr` (0-dependency QR decoder with perspective correction)
3. **Re-encode** the data at scale=1 using `qr` → produces a 1-bit PNG by default where each module is exactly 1 pixel

This is **not** an image resizer. It's a decode-and-remint operation.

## Dependencies

- **`qr`** — 0-dependency QR encoder + decoder
- **`cross-image`** — Pure JS image decoder (no native deps)

## License

MIT

## Text and decoding limits

Generate directly with `atomizeQr('', { text: 'Hello 🌍' })` or
`qr-atomize --text 'Hello 🌍'`. Image inputs must contain supported UTF-8 text.
Unmarked byte segments are assumed to be UTF-8; invalid UTF-8 and explicit
non-UTF-8 ECI encodings fail rather than silently changing the text. Arbitrary
binary payloads are unsupported. Re-encoding preserves text, not the original
module pattern or encoding metadata.

Encoding tries medium error correction, then low if the payload exceeds medium
capacity. Output uses one pixel per module. The compact default border is two;
use `border: 4` (CLI `--border 4`) for a standards-conformant quiet zone.
CLI `--format raw` writes a JSON matrix; `--quiet` suppresses success output.
Use `format: 'gif'` or CLI `--format gif` for GIF output. PNG was consistently
smaller than this GIF encoder in our measurements. Lossless WebP was smaller
still in those samples, but is currently an input format, not an output option.

`invert: true` or CLI `--invert` swaps output polarity relative to the input;
otherwise input polarity is preserved. The decoder uses jsQR as a fallback for
difficult images and a WebP fallback for formats cross-image cannot decode.
Named exports `decodeInput` and `reEncode` remain available. `decodeInput` returns
RGBA image data; `reEncode(text, { border, format, invert })` renders text.
