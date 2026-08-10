# qr-atomize

Atomize any QR code image — 1 pixel per module.

Takes a QR code image (PNG, JPEG, GIF, WebP, BMP) and returns the same QR code re-rendered at **1 pixel per module** (plus a configurable quiet zone). The output is a GIF (the smallest lossless format for 1-bit data).

## Install

```bash
npm install qr-atomize
```

## Usage

### API

```ts
import atomizeQr from 'qr-atomize';

// From file path
const gif = await atomizeQr('qrcode.png');

// From buffer
const gif = await atomizeQr(buffer);

// With options
const gif = await atomizeQr('qrcode.png', { border: 4 });

// Raw 2D boolean array
const raw = await atomizeQr('qrcode.png', { format: 'raw' });
```

### CLI

```bash
npx qr-atomize input.png -o output.gif
npx qr-atomize input.jpg --border 4
npx qr-atomize input.gif --quiet
```

## API

### `atomizeQr(input, opts?)`

**Parameters:**

- `input` — `Buffer | string` — Image buffer or file path
- `opts.border` — `number` — Quiet zone in modules (default: 2, minimum: 1)
- `opts.format` — `'gif' | 'raw'` — Output format (default: `'gif'`)

**Returns:** `Promise<Buffer>` (gif) or `Promise<boolean[][]>` (raw)

## How it works

1. **Decode** the input image using `cross-image` (pure JS, no native deps)
2. **Read** the QR code data using `qr` (0-dependency QR decoder with perspective correction)
3. **Re-encode** the data at scale=1 using `qr` → produces a GIF where each module is exactly 1 pixel

This is **not** an image resizer. It's a decode-and-remint operation.

## Dependencies

- **`qr`** — 0-dependency QR encoder + decoder
- **`cross-image`** — Pure JS image decoder (no native deps)

## License

MIT
