# AGENTS.md

## Build & test

Tests import from `../dist/index.js` (built output), not source. Always build before testing:

```bash
npm run build && npm test
```

No separate typecheck script — `tsc` (build) emits declarations and checks types. No linter configured.

## Decoder architecture

The `qr` library (v0.6.0) is the primary decoder. It has known failures on certain valid QR codes — e.g. macOS screenshots with surrounding browser chrome, where its alignment-pattern detection produces a wrong perspective transform and all 32 ECC/mask combos fail RS decode.

`jsqr` is a runtime dependency used as a **fallback decoder** in `src/index.ts`. It uses a different detection pipeline (4-corner perspective, its own binarizer). The fallback is silent — it only activates when the primary decoder throws.

When adding new test fixtures that fail with `RS.decode: invalid errors number`, the fix is usually "this image needs the jsQR fallback path," not a bug in the `qr` library's Reed-Solomon math.

## jsQR ESM interop

`jsqr` is a UMD bundle. With `module: "Node16"` + `esModuleInterop`, the default import wraps the function one level deep. The unwrap in `src/index.ts` is intentional — do not simplify it without testing.

## Test framework

Tests use Node.js built-in `node:test` runner (`describe`/`it`), not jest/vitest/mocha. The test file is plain ESM JavaScript (`test/index.test.js`), not TypeScript.

Run a single describe block:
```bash
node --test test/index.test.js --test-name-pattern "macOS screenshot"
```

## Fixtures

`test/fixtures/` contains valid QR images, WebP with embedded logo, a macOS screenshot (exercises jsQR fallback), and several GIGO cases (damaged, noise, empty, truncated, fake). The GIGO tests assert specific error patterns (`/Finder/`) — if you change error messages, update the matchers.

## Image decoding pipeline

`cross-image` handles PNG/JPEG/GIF/BMP/TIFF/ICO. WebP falls back to `@cwasm/webp` (native WASM) — see `src/decode-input.ts`. The fallback triggers on error messages containing `WebP` or `VP8L`.

## Publishing

Uses npm OIDC trusted publishing — **no `NPM_TOKEN` secret**. Requires:
- `actions/checkout@v6` and `actions/setup-node@v6` (v4 does not work with OIDC)
- `id-token: write` permission
- `--provenance` flag on `npm publish`
- Package linked to GitHub repo at npmjs.com/settings under "Publishing access"

Release flow: `npm version patch && git push --tags` triggers the publish workflow via `on: push: tags: v*`. The workflow verifies the tag matches `package.json` version before publishing.

CI runs on every push to any branch (`ci.yml`).
