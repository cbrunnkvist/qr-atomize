> Qualification: these measurements describe the sampled encoders and payloads, not universal format bounds. The quantity `ceil(N²/8)` is uncompressed module storage, not an information-theoretic lower bound: QR modules contain redundant structure and can compress below it. Statements below about a “floor”, “never”, or the smallest practical format should be read subject to this qualification. Benchmark scripts referenced below are not included in this repository.

# Research notes: bitmap vs SVG (and WebP) storage for 1-pixel-per-module QR codes

**Question:** The claim "just generate your QR code as SVG" — is SVG ever smaller than a 1 px/module bitmap for any QR module count? At what point do the formats converge?

**Answer:** **No.** SVG never beats any bitmap format at any QR version (1–40, 21–177 modules), raw or gzipped. WebP lossless (`cwebp -lossless -z 9`) is the smallest *practical* format (~0.78× PNG, ~0.12× GIF) but still sits above the raw bit floor `N²/8` at every size. Nothing converges below the information-theoretic floor.

---

## Methodology

- **Encoder:** `qr` package (paulmillr/qr) for all formats — same QR pattern, same quiet zone (2 modules), only the container differs.
- **Versions:** 1–40 → `N = 4·v + 17` symbol modules; image width `W = N + 4` px (2-module quiet zone each side).
- **Payloads:** filled to ~97% of each version's byte-mode capacity (binary-search max length), forced into byte mode via a pool containing non-alphanumeric characters. Also tested alphanumeric (realistic URL/token-ish) payloads.
- **ECC levels:** `medium` (primary) and `high` (confirmation).
- **Formats measured:**
  - `GIF @ 1px/module` — `encodeQR(..., 'gif', { scale: 1 })` (this repo's output format)
  - `PNG @ 1px/module` — hand-rolled, filter 0, deflate level 9
  - `PNG max` — ImageMagick `convert -define png:compression-level=9`
  - `WebP lossless` — `cwebp -lossless -z 9 -metadata none` (max setting available)
  - `SVG path` — `encodeQR(..., 'svg', { optimize: true })` (single-path, the compact form the claim implies)
  - `SVG rect` — `encodeQR(..., 'svg', { optimize: false })` (one `<rect>` per module)
  - `bit floor` — `ceil(N² / 8)` raw packed bits (information-theoretic minimum)
  - Gzip (`level 9`) applied to SVG/GIF/PNG/floor for over-the-wire scenario.
- **Validity:** WebP outputs verified pixel-exact by `cwebp` → `dwebp` → `magick compare -metric AE = 0` at v1, 2, 5, 10, 20, 30, 40 (7/7 exact).

Scripts (run from repo root):
```
node /tmp/opencode/qr-size-bench.mjs [ecc]        # GIF/PNG/SVG/floor sweep
node /tmp/opencode/qr-webp-vs-png.mjs [ecc]       # WebP vs PNG sweep
node /tmp/opencode/qr-webp-verify.mjs             # WebP round-trip check
```

---

## Primary results — ECC medium, byte-mode (high-entropy) payload

| v | N (modules) | Image px | data B | GIF @1px | PNG @1px | WebP lossless | SVG path | bit floor N²/8 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 21 | 25 | 13 | 1047 | 182 | **120** | 2932 | 56 |
| 2 | 25 | 29 | 25 | 1267 | 215 | **154** | 3804 | 79 |
| 3 | 29 | 33 | 40 | 1519 | 260 | **194** | 4867 | 106 |
| 4 | 33 | 37 | 60 | 1803 | 314 | **232** | 6604 | 137 |
| 5 | 37 | 41 | 81 | 2121 | 362 | **274** | 8052 | 172 |
| 6 | 41 | 45 | 102 | 2471 | 418 | **314** | 10299 | 211 |
| 7 | 45 | 49 | 118 | 2853 | 483 | **366** | 12313 | 254 |
| 8 | 49 | 53 | 147 | 3267 | 545 | **412** | 14505 | 301 |
| 9 | 53 | 57 | 174 | 3713 | 622 | **474** | 16911 | 352 |
| 10 | 57 | 61 | 206 | 4193 | 707 | **522** | 19370 | 407 |
| 11 | 61 | 65 | 243 | 4705 | 773 | **594** | 23015 | 466 |
| 12 | 65 | 69 | 278 | 5249 | 869 | **648** | 25516 | 529 |
| 13 | 69 | 73 | 321 | 5827 | 957 | **738** | 28882 | 596 |
| 14 | 73 | 77 | 351 | 6437 | 1066 | **796** | 32535 | 667 |
| 15 | 77 | 81 | 399 | 7079 | 1156 | **886** | 35983 | 742 |
| 16 | 81 | 85 | 436 | 7753 | 1266 | **954** | 40092 | 821 |
| 17 | 85 | 89 | 488 | 8459 | 1357 | **1062** | 42728 | 904 |
| 18 | 89 | 93 | 543 | 9199 | 1484 | **1128** | 48589 | 991 |
| 19 | 93 | 97 | 605 | 9971 | 1614 | **1248** | 52868 | 1082 |
| 20 | 97 | 101 | 646 | 10775 | 1727 | **1322** | 57574 | 1177 |
| 21 | 101 | 105 | 689 | 11613 | 1866 | **1452** | 62076 | 1276 |
| 22 | 105 | 109 | 755 | 12483 | 1987 | **1530** | 67112 | 1379 |
| 23 | 109 | 113 | 831 | 13385 | 2129 | **1668** | 71854 | 1486 |
| 24 | 113 | 117 | 883 | 14319 | 2281 | **1752** | 77568 | 1597 |
| 25 | 117 | 121 | 967 | 15287 | 2421 | **1906** | 83066 | 1712 |
| 26 | 121 | 125 | 1027 | 16287 | 2584 | **2004** | 89196 | 1831 |
| 27 | 125 | 129 | 1091 | 17319 | 2739 | **2090** | 94783 | 1954 |
| 28 | 129 | 133 | 1154 | 18383 | 2929 | **2200** | 100866 | 2081 |
| 29 | 133 | 137 | 1226 | 19479 | 3087 | **2424** | 106402 | 2212 |
| 30 | 137 | 141 | 1328 | 20609 | 3276 | **2526** | 114720 | 2347 |
| 31 | 141 | 145 | 1408 | 21771 | 3445 | **2698** | 120736 | 2486 |
| 32 | 145 | 149 | 1491 | 22967 | 3614 | **2810** | 126808 | 2629 |
| 33 | 149 | 153 | 1579 | 24193 | 3786 | **2992** | 134275 | 2776 |
| 34 | 153 | 157 | 1670 | 25453 | 4001 | **3124** | 141990 | 2927 |
| 35 | 157 | 161 | 1754 | 26745 | 4207 | **3320** | 146276 | 3082 |
| 36 | 161 | 165 | 1853 | 28071 | 4378 | **3434** | 157367 | 3241 |
| 37 | 165 | 169 | 1929 | 29427 | 4631 | **3646** | 165149 | 3404 |
| 38 | 169 | 173 | 2036 | 30817 | 4826 | **3772** | 172825 | 3571 |
| 39 | 173 | 177 | 2146 | 32239 | 5043 | **3996** | 180873 | 3742 |
| 40 | 177 | 181 | 2261 | 33695 | 5258 | **4126** | 186944 | 3917 |

**Crossover (raw bytes):** SVG path < GIF from `never` | SVG path < PNG from `never` | SVG path < bit floor from `never`
**Crossover (gzip level 9):** gzSVG path < gzGIF from `never` | gzSVG path < gzPNG from `never` | gzSVG path < gzFloor from `never`

**WebP vs PNG:** WebP < PNG from v1 (N=21); WebP < PNG max from v1; WebP < GIF from v1; WebP < SVG from v1; WebP < bit floor from `never`.
- avg WebP/PNG ratio: **0.78×**
- avg WebP/GIF ratio: **0.12×** (~8–9× smaller than GIF)

---

## Secondary: ECC medium, alphanumeric (realistic) payload

| v | N | data B | GIF | PNG | WebP | SVG path | floor |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 21 | 13 | 1047 | 178 | 124 | 2714 | 56 |
| 5 | 37 | 81 | 2121 | 358 | 272 | 8157 | 172 |
| 10 | 57 | 206 | 4193 | 697 | 522 | 20011 | 407 |
| 20 | 97 | 646 | 10775 | 1728 | 1328 | 57999 | 1177 |
| 30 | 137 | 1328 | 20609 | 3283 | 2532 | 114111 | 2347 |
| 40 | 177 | 2261 | 33695 | 5278 | 4122 | 191833 | 3917 |

**Crossover:** SVG < GIF / PNG from `never` (raw and gzip). WebP < PNG/GIF/SVG from v1. Same qualitative result as byte mode; SVG ≈ 12–15% smaller than byte-mode case but still far above bitmap.

---

## Confirmation: ECC high (lower capacity, denser modules)

Same pattern holds: WebP < PNG max < PNG < GIF < SVG at every version; WebP/GIF ratio ≈ 0.12×; SVG path at v40 ≈ 190,890 B vs GIF ≈ 33,695 B (≈ 5.7×). No crossover at any module count.

---

## Round-trip validity (WebP)

| v | N | WebP bytes | `magick compare -metric AE` |
|---:|---:|---:|---:|
| 1 | 25 | 120 B | 0 (pixel-exact) |
| 2 | 29 | 154 B | 0 |
| 5 | 41 | 272 B | 0 |
| 10 | 61 | 522 B | 0 |
| 20 | 101 | 1322 B | 0 |
| 30 | 141 | 2530 B | 0 |
| 40 | 177 | 4126 B | 0 |

WebP lossless round-trips pixel-exact at all spot-checked sizes; compressed output matches input PNG pixel-for-pixel.

---

## Interpretation

| Claim | Result |
|---|---|
| "Just use SVG, it's smaller" | **False.** SVG (even single-path optimized) is 6–50× larger than a 1 px/module bitmap at every QR size. |
| There is a module count where SVG converges below bitmap | **False.** No crossover across versions 1–40; gap *widens* as N grows (SVG emits path commands per dark module, PNG/WebP deflate repeated structure). |
| WebP beats PNG at max optimization | **True.** `cwebp -z 9` ≈ 0.78× my hand-rolled deflate-9 PNG and beats ImageMagick's max PNG too, at every size. |
| Any format reaches the raw bit floor | **False.** WebP ≈ 1.05–1.2× the floor `ceil(N²/8)`; the floor itself is not a storable encoded image (no headers/ECC/marker overhead). |

**Bottom line:** For storage/transfer size of a 1-pixel-per-module QR code, **lossless WebP is the smallest practical format**, then PNG, then GIF, then SVG by a wide margin. SVG's advantage is resolution-independence (scalability), not compactness — and at 1 px/module that advantage is irrelevant since the bitmap is already native resolution.
