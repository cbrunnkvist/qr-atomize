#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import atomizeQr from '../index.js';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
qr-atomize — Reduce any QR code to 1 pixel per module

Usage:
  qr-atomize <input> [options]
  qr-atomize -t, --text <content> [options]

Modes:
  <input>                 Re-encode an existing QR code image
  -t, --text <content>    Generate from text (UTF-8 supported)

Options:
  -o, --output <file>   Output file path (default: <input>-atomized.png or qr-atomized.png)
  -b, --border <n>      Quiet zone in modules (default: 2)
  -f, --format <fmt>    Output format: png (default) or gif
  -x, --invert          Invert output polarity (swap black/white)
  -h, --help            Show this help

Supported input formats: PNG, JPEG, GIF, WebP, BMP, TIFF, ICO
`.trim());
  process.exit(0);
}

let inputPath: string | undefined;
let text: string | undefined;
let outputPath: string | undefined;
let border: number | undefined;
let format: 'png' | 'gif' | undefined;
let invert: boolean | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-o' || arg === '--output') {
    outputPath = args[++i];
  } else if (arg === '-b' || arg === '--border') {
    border = Number(args[++i]);
  } else if (arg === '-f' || arg === '--format') {
    const f = args[++i];
    if (f !== 'png' && f !== 'gif') {
      console.error('Error: --format must be "png" or "gif".');
      process.exit(1);
    }
    format = f;
  } else if (arg === '-x' || arg === '--invert') {
    invert = true;
  } else if (arg === '-t' || arg === '--text') {
    text = args[++i];
  } else if (!arg.startsWith('-')) {
    inputPath = arg;
  }
}

if (text !== undefined && inputPath !== undefined) {
  console.error('Error: --text and <input> are mutually exclusive.');
  process.exit(1);
}

if (text === undefined && inputPath === undefined) {
  console.error('Error: No input file or --text content specified.');
  process.exit(1);
}

const outExt = format === 'gif' ? '.gif' : '.png';

try {
  const input = inputPath !== undefined ? readFileSync(resolve(inputPath)) : '';
  const out = await atomizeQr(input, { text, border, format, invert });

  if (!outputPath) {
    if (inputPath !== undefined) {
      const resolvedInput = resolve(inputPath);
      const ext = extname(resolvedInput);
      const base = basename(resolvedInput, ext);
      outputPath = resolve(`${base}-atomized${outExt}`);
    } else {
      outputPath = resolve(`qr-atomized${outExt}`);
    }
  } else {
    outputPath = resolve(outputPath);
  }

  writeFileSync(outputPath, out);
  console.log(`Atomized: ${outputPath} (${out.byteLength} bytes)`);
} catch (err: unknown) {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
