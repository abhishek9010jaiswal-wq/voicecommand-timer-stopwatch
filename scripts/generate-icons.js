import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#311042"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  
  <!-- Stopwatch Top Button & Ring -->
  <rect x="236" y="44" width="40" height="34" rx="8" fill="url(#accent)"/>
  <rect x="216" y="32" width="80" height="20" rx="8" fill="#e2e8f0"/>
  <rect x="360" y="92" width="28" height="38" rx="6" transform="rotate(35 360 92)" fill="url(#accent)"/>

  <!-- Outer Stopwatch Circle -->
  <circle cx="256" cy="280" r="170" fill="none" stroke="url(#ring)" stroke-width="20"/>
  <circle cx="256" cy="280" r="140" fill="#090d16" stroke="#334155" stroke-width="4"/>

  <!-- Dial Ticks -->
  <circle cx="256" cy="160" r="6" fill="#38bdf8"/>
  <circle cx="376" cy="280" r="6" fill="#38bdf8"/>
  <circle cx="256" cy="400" r="6" fill="#38bdf8"/>
  <circle cx="136" cy="280" r="6" fill="#38bdf8"/>

  <!-- Voice Waves Overlay -->
  <path d="M210 280 Q210 230 256 230 Q302 230 302 280" fill="none" stroke="#818cf8" stroke-width="6" stroke-linecap="round"/>
  <path d="M190 280 Q190 210 256 210 Q322 210 322 280" fill="none" stroke="#a855f7" stroke-width="4" stroke-linecap="round" opacity="0.7"/>

  <!-- Stopwatch Hand pointing up-right -->
  <line x1="256" y1="280" x2="310" y2="200" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
  <circle cx="256" cy="280" r="14" fill="#f8fafc"/>
  <circle cx="256" cy="280" r="6" fill="#0f172a"/>

  <!-- Microphone Icon in Lower Center -->
  <rect x="246" y="315" width="20" height="32" rx="10" fill="#38bdf8"/>
  <path d="M240 330 A16 16 0 0 0 272 330" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
  <line x1="256" y1="346" x2="256" y2="358" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

// Helper function to create a PNG buffer
function createPng(width, height, isMaskable = false) {
  // CRC Table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);

  // Raw image data with scanlines
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * (isMaskable ? 0.38 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep dark indigo background
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      if (!isMaskable) {
        // Round corners if not maskable
        const cornerR = width * 0.2;
        const inCornerX = x < cornerR ? cornerR - x : x > width - cornerR ? x - (width - cornerR) : 0;
        const inCornerY = y < cornerR ? cornerR - y : y > height - cornerR ? y - (height - cornerR) : 0;
        if (inCornerX > 0 && inCornerY > 0) {
          if (Math.sqrt(inCornerX * inCornerX + inCornerY * inCornerY) > cornerR) {
            a = 0;
          }
        }
      }

      if (a > 0) {
        // Glowing circular dial
        if (Math.abs(dist - radius) < radius * 0.1) {
          // Cyan/violet ring
          const angle = Math.atan2(dy, dx);
          r = Math.floor(56 + Math.cos(angle) * 30);
          g = Math.floor(189 + Math.sin(angle) * 40);
          b = 248;
        } else if (dist < radius) {
          // Dark dial center
          r = 10;
          g = 15;
          b = 30;
          // Center stopwatch dot
          if (dist < radius * 0.15) {
            r = 248;
            g = 250;
            b = 252;
          }
          // Stopwatch hand towards top-right
          const handAngle = -Math.PI / 4;
          const ptDist = Math.abs(dx * Math.sin(handAngle) - dy * Math.cos(handAngle));
          const ptAlong = dx * Math.cos(handAngle) + dy * Math.sin(handAngle);
          if (ptDist < 4 && ptAlong > 0 && ptAlong < radius * 0.75) {
            r = 56;
            g = 189;
            b = 248;
          }
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = chunk('IDAT', deflated);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(32, 32, false));

console.log('All PWA icons generated successfully in /public');
