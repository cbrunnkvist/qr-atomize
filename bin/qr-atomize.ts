#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { writeFile } from 'fs/promises';
import { basename, extname } from 'path';
import atomizeQr from '../src/index.js';

const args = process.argv.slice(2);

function showHelp(): never {
  console.log(`Usage: qr-atomize <input> [options]
       qr-atomize --text <content> [options]

Atomize a QR code — 1 pixel per module.

Modes:
  <input>                 Re-encode an existing QR code image
  -t, --text <content>    Generate from text (UTF-8 supported)

Options:
  -o, --output <file>   Output file path (default: <input>-atomized.png or qr-atomized.png)
  -b, --border <n>      Quiet zone in modules (default: 2)
  -f, --format <fmt>   Output format: png (default), gif, or raw (JSON)
  -x, --invert         Swap output polarity
  -q, --quiet           Suppress non-error output
  -h, --help            Show this help`);
  process.exit(0);
}

if (args.length === 0) showHelp();

let input: string | undefined;
let text: string | undefined;
let output: string | undefined;
let border = 2;
let quiet = false;
let format: 'png' | 'gif' | 'raw' = 'png';
let invert = false;

try {
  const parsed = parseArgs({ args, strict: true, allowPositionals: true, options: {
    output: { type: 'string', short: 'o' }, border: { type: 'string', short: 'b' },
    text: { type: 'string', short: 't' }, quiet: { type: 'boolean', short: 'q' },
    format: { type: 'string', short: 'f' }, invert: { type: 'boolean', short: 'x' },
    help: { type: 'boolean', short: 'h' },
  }, tokens: true });
  if (parsed.values.help) showHelp();
  for (const name of ['output', 'border', 'text', 'format']) {
    if (parsed.tokens.filter(token => token.kind === 'option' && token.name === name).length > 1) {
      throw new Error(`--${name} may only be provided once`);
    }
  }
  if (parsed.positionals.length > 1) throw new Error('Provide only one input file');
  if (parsed.values.format !== undefined && parsed.values.format !== 'png' && parsed.values.format !== 'gif' && parsed.values.format !== 'raw') throw new Error('--format must be png, gif, or raw');
  format = parsed.values.format ?? 'png';
  invert = parsed.values.invert ?? false;
  input = parsed.positionals[0];
  text = parsed.values.text;
  output = parsed.values.output;
  if (output === '') throw new Error('--output requires a nonempty path');
  quiet = parsed.values.quiet ?? false;
  if (parsed.values.border !== undefined) {
    if (!/^-?\d+$/.test(parsed.values.border)) throw new Error('--border must be an integer');
    border = Number(parsed.values.border);
    if (!Number.isSafeInteger(border)) throw new Error('--border must be a safe integer');
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
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
    output = `${base}-atomized.${format === 'raw' ? 'json' : format}`;
  } else {
    output = `qr-atomized.${format === 'raw' ? 'json' : format}`;
  }
}

try {
  const result = await atomizeQr(input ?? '', { text, border, format, invert });
  await writeFile(output, Buffer.isBuffer(result) ? result : JSON.stringify(result));
  if (!quiet) {
    console.log(`Atomized QR written to ${output}`);
  }
} catch (err: unknown) {
  console.error(`Error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
