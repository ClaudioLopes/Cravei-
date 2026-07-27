// Gera ícones PNG simples (sem dependências externas, só zlib nativo do Node) como placeholder
// até haver uma logo de verdade. Fundo navy (#0B1D3A) + bola verde (#2ECC71) centralizada.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const BG = [0x0b, 0x1d, 0x3a];
const ACCENT = [0x2e, 0xcc, 0x71];
const ACCENT_DARK = [0x22, 0x9a, 0x55];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size, drawFn) {
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3);
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = drawFn(x, y, size);
      const off = rowStart + 1 + x * 3;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function circleDraw({ size, radiusRatio, bg, fg, ringShade }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * radiusRatio;
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > r) return bg;
    // leve sombreado radial pra não ficar um circulo totalmente chapado
    const t = dist / r;
    const shade = ringShade ? 1 - t * 0.25 : 1;
    return fg.map((c) => Math.round(c * shade));
  };
}

const outDir = path.join(__dirname, 'assets');
fs.mkdirSync(outDir, { recursive: true });

// icon.png (iOS + fallback): bola ocupando boa parte do quadro
fs.writeFileSync(
  path.join(outDir, 'icon.png'),
  makePng(1024, circleDraw({ size: 1024, radiusRatio: 0.38, bg: BG, fg: ACCENT, ringShade: true })),
);

// adaptive-icon.png (Android): conteúdo mais recuado (zona segura ~66%)
fs.writeFileSync(
  path.join(outDir, 'adaptive-icon.png'),
  makePng(1024, circleDraw({ size: 1024, radiusRatio: 0.26, bg: BG, fg: ACCENT, ringShade: true })),
);

// splash-icon.png: versão menor, mesma marca
fs.writeFileSync(
  path.join(outDir, 'splash-icon.png'),
  makePng(400, circleDraw({ size: 400, radiusRatio: 0.34, bg: BG, fg: ACCENT_DARK, ringShade: true })),
);

// favicon.png (web)
fs.writeFileSync(
  path.join(outDir, 'favicon.png'),
  makePng(48, circleDraw({ size: 48, radiusRatio: 0.4, bg: BG, fg: ACCENT, ringShade: false })),
);

console.log('Ícones gerados em', outDir);
