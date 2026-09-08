#!/usr/bin/env node
// Renders the war board PWA icons as PNGs. Zero dependencies — rasterizes the
// Allerion chevron with a distance field and encodes PNG via zlib directly,
// so icon generation needs no image library.
//
// Usage: node scripts/govcon/make-icons.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve(__dirname, '..', '..', 'govcon', 'warboard', 'icons');

const GROUND = [6, 8, 10, 255];
const OLIVE = [143, 163, 126, 255];

// Chevron polyline in a 32x32 design space, matching the app bar mark.
const PATH = [[3, 22], [10, 22], [16, 10], [22, 22], [29, 22]];
const STROKE = 2.75;
const SS = 3; // supersample factor per axis

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function coverage(px, py, scale, inset) {
  // px,py are pixel coords; map into 32-space accounting for inset padding.
  let hits = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const x = ((px + (sx + 0.5) / SS) / scale - inset) / (1 - 2 * inset / 32) ;
      const y = ((py + (sy + 0.5) / SS) / scale - inset) / (1 - 2 * inset / 32);
      let d = Infinity;
      for (let i = 0; i < PATH.length - 1; i++) {
        d = Math.min(d, distToSegment(x, y, PATH[i], PATH[i + 1]));
      }
      if (d <= STROKE / 2) hits++;
    }
  }
  return hits / (SS * SS);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

function png(size, inset) {
  const scale = size / 32;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const a = coverage(x, y, scale, inset);
      for (let c = 0; c < 4; c++) {
        raw[o++] = Math.round(GROUND[c] * (1 - a) + OLIVE[c] * a);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
const targets = [
  ['icon-192.png', 192, 3],
  ['icon-512.png', 512, 3],
  // Maskable icons are cropped to a circle; keep the mark inside the 80% safe zone.
  ['icon-maskable-512.png', 512, 6],
  ['apple-touch-icon.png', 180, 3],
];
for (const [name, size, inset] of targets) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, png(size, inset));
  console.log(`${name}  ${size}x${size}  ${fs.statSync(file).size} bytes`);
}
