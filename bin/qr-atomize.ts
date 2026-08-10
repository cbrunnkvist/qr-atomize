#!/usr/bin/env node
import { writeFile } from 'fs/promises';
import { basename, extname } from 'path';
import atomizeQr from '../src/index.js';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: qr-atomize <input> [options]
       qr-atomize --text <content> [options]

Atomize a QR code — 1 pixel per module.

Modes:
  <input>                 Re-encode an existing QR code image
  -t, --text <content>    Generate from text (UTF-8 supported)

Options:
  -o, --output <file>   Output file path (default: <input>-atomized.gif or qr-atomized.gif)
  -b, --border <n>      Quiet zone in modules (default: 2)
  -q, --quiet           Suppress non-error output
  -h, --help            Show this help`);
  process.exit(0);
}

let input: string | undefined;
let text: string | undefined;
let output: string | undefined;
let border = 2;
let quiet = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if ((arg === '-o' || arg === '--output') && args[i + 1]) {
    output = args[++i];
  } else if ((arg === '-b' || arg === '--border') && args[i + 1]) {
    border = parseInt(args[++i], 10);
    if (isNaN(border)) {
      console.error('Error: --border must be a number');
      process.exit(1);
    }
  } else if (arg === '-q' || arg === '--quiet') {
    quiet = true;
  } else if ((arg === '-t' || arg === '--text') && args[i + 1]) {
    text = args[++i];
  } else if (!arg.startsWith('-')) {
    input = arg;
  }
}

if (text !== undefined && input !== undefined) {
  console.error('Error: --text and <input> are mutually exclusive');
  process.exit(1);
}

if (text === undefined && input === undefined) {
  console.error('Error: provide <input> file or --text <content>');
  process.exit(1);
}

if (!output) {
  if (input) {
    const ext = extname(input);
    const base = basename(input, ext);
    output = `${base}-atomized.gif`;
  } else {
    output = 'qr-atomized.gif';
  }
}

try {
  const result = await atomizeQr(input ?? '', { text, border }) as Buffer;
  await writeFile(output, result);
  if (!quiet) {
    console.log(`Atomized QR written to ${output}`);
  }
} catch (err: unknown) {
  console.error(`Error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
