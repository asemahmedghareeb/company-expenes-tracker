/**
 * Generates PWA icon PNGs with zero dependencies (manual PNG encoder on
 * node:zlib). Art: indigo→sky gradient tile + white wallet glyph.
 * Usage: node scripts/generate-pwa-icons.mjs
 * Outputs to public/: icon-192.png, icon-512.png, icon-maskable-512.png,
 * apple-touch-icon.png (180).
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// Brand gradient stops (indigo-600 → sky-500).
const TOP = [79, 70, 229];
const BOTTOM = [14, 165, 233];

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Signed distance to a rounded rect (negative = inside). */
function sdRR(x, y, x0, y0, x1, y1, r) {
  if (x >= x0 + r && x <= x1 - r && y >= y0 && y <= y1) return -1;
  if (y >= y0 + r && y <= y1 - r && x >= x0 && x <= x1) return -1;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  return Math.hypot(x - cx, y - cy) - r;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Renders the tile. `artScale` shrinks the glyph+gradient box for the
 * maskable safe zone (1 = full-bleed, 0.8 = maskable). Background outside
 * the art box is solid indigo so nothing transparent ever shows.
 */
function render(size, artScale) {
  const buf = Buffer.alloc(size * size * 4);
  const m = size * ((1 - artScale) / 2); // art box margin
  const px = size - 2 * m || 1; // pixels per art-box unit (for AA width)
  const cov = (d) => clamp01(0.5 - d * px);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Base: solid indigo (maskable padding + fallback).
      let r = TOP[0], g = TOP[1], b = TOP[2];
      if (x >= m && y >= m && x < size - m && y < size - m) {
        const t = (y - m) / (size - 2 * m || 1);
        r = lerp(TOP[0], BOTTOM[0], t);
        g = lerp(TOP[1], BOTTOM[1], t);
        b = lerp(TOP[2], BOTTOM[2], t);
      }
      // Wallet glyph in art-box coordinates (u,v in 0..1): solid white
      // card body, indigo pocket slit, white clasp dot. Filled shapes stay
      // crisp at every icon size.
      const u = (x - m) / (size - 2 * m || 1);
      const v = (y - m) / (size - 2 * m || 1);
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        const body = cov(sdRR(u, v, 0.26, 0.37, 0.74, 0.67, 0.08));
        const pocket = cov(sdRR(u, v, 0.47, 0.475, 0.68, 0.585, 0.035));
        const dot = cov(Math.hypot(u - 0.595, v - 0.53) - 0.024);
        if (body > 0) {
          r = lerp(r, 255, body);
          g = lerp(g, 255, body);
          b = lerp(b, 255, body);
        }
        const pk = pocket * body;
        if (pk > 0) {
          r = lerp(r, TOP[0], pk);
          g = lerp(g, TOP[1], pk);
          b = lerp(b, TOP[2], pk);
        }
        const cl = dot * pk;
        if (cl > 0) {
          r = lerp(r, 255, cl);
          g = lerp(g, 255, cl);
          b = lerp(b, 255, cl);
        }
      }
      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

const jobs = [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["icon-maskable-512.png", 512, 0.8],
  ["apple-touch-icon.png", 180, 1],
];
for (const [name, size, scale] of jobs) {
  writeFileSync(join(OUT, name), encodePng(size, render(size, scale)));
  console.log(`wrote public/${name} (${size}x${size})`);
}
