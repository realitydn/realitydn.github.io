# REALITY QR codes

All codes encode **https://realitydn.com** — the canonical address.
(www.realitydn.com 301-redirects there; encoding the apex saves every scan a
redirect hop. The *printed* URL next to a QR stays `www.realitydn.com` per the
brand's mandatory elements.)

QR spec: version 2 (25×25 modules), error correction M, 4-module quiet zone.
Verified decodable with OpenCV from 120px up; print at ≥ 2×2 cm.

| File | Use |
|---|---|
| `reality-qr-ink-on-white.png` | print materials (2160px) |
| `reality-qr-ink-on-cream.png` | digital / cream surfaces (2160px) |
| `reality-qr-ink-transparent.png` | drop onto any light surface (2160px) |
| `reality-qr-ink.svg` | vector, any scale, transparent |
| `reality-qr-matrix.js` | raw module matrix (powers the Poster Studio QR) |

Rules of thumb:

- Always dark modules on a light tile. Never invert (cream modules on ink) —
  many phone cameras refuse inverted codes. On dark/night posters, place the
  QR as a cream tile with ink modules, like the poster footer atoms do.
- Keep the quiet zone — don't crop tighter than the files ship.
- Regenerate (or add a UTM-tagged variant for scan tracking) with
  `python tools/generate-qr.py`.
