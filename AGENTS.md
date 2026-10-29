# AGENTS.md

## Build and tests

Run `npm test`: it builds with TypeScript and runs both `test/index.test.js`
(historical fixture tests) and the compiled `test/index.test.ts` regression suite.
No linter is configured.

## Architecture

`src/index.ts` exposes the API. `bin/qr-atomize.ts` is the canonical CLI;
`src/bin/qr-atomize.ts` forwards to it for source-path compatibility.
Built API files are under `dist/src/`; built CLI files are under `dist/bin/`.

PNG (packed 1-bit grayscale) is the default; GIF and raw matrices are API options.
PNG uses fast-png. The qr encoder provides module matrices, trying medium error
correction first and low only on capacity overflow. Input polarity is preserved;
`invert` swaps it. The compact default border is two; four is standards-conformant.

`decodeInput` decodes and prepares RGBA images, composites alpha onto white, and
upscales small inputs using nearest-neighbor. Packed 1-bit grayscale PNG needs
explicit unpacking because cross-image misreads it. WebP has an @cwasm/webp fallback.
`readQr` tries qr then jsQR (needed for the screenshot/logo fixtures). Strict UTF-8
validation applies to both decoders; unsupported encoding errors must not fall
through to another decoder and silently corrupt data. jsQR requires the existing
ESM/UMD unwrap under Node16 module resolution.

## Publishing

Existing tags and merges must be preserved. The publish workflow checks out the
selected tag and uses npm OIDC with provenance. A tag already pushed must not be
moved to a later reconciliation commit; use a new version for a subsequent release.
