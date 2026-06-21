// Генерирует фирменные BMP для NSIS-установщика без сторонних зависимостей.
// installerSidebar: 164x314 (страница приветствия/завершения)
// installerHeader:  150x57  (шапка остальных страниц)
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

// Возвращает [b,g,r] для пикселя — фирменный тёмно-синий градиент с мягким сиянием.
function pixel(x, y, w, h) {
  const t = y / h;                       // вертикальный градиент
  // от #0a0e1a (низ) к #0f2a4d (верх) + лёгкое голубое свечение по диагонали
  const baseR = 10 + (15 - 10) * (1 - t);
  const baseG = 14 + (42 - 14) * (1 - t);
  const baseB = 26 + (77 - 26) * (1 - t);
  // диагональное сияние
  const cx = w * 0.32, cy = h * 0.30;
  const d = Math.hypot(x - cx, y - cy) / Math.hypot(w, h);
  const glow = Math.max(0, 0.55 - d) * 120;
  return [
    clamp(baseB + glow * 1.0),
    clamp(baseG + glow * 0.8),
    clamp(baseR + glow * 0.35),
  ];
}

function makeBMP(w, h) {
  const rowSize = Math.floor((24 * w + 31) / 32) * 4; // padded to 4 bytes
  const pixelArraySize = rowSize * h;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);          // pixel data offset
  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);          // 24 bpp
  buf.writeUInt32LE(0, 30);           // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38);         // 72 DPI
  buf.writeInt32LE(2835, 42);

  // pixels (bottom-up)
  for (let row = 0; row < h; row++) {
    const yTop = h - 1 - row;         // изображение сверху вниз
    let off = 54 + row * rowSize;
    for (let x = 0; x < w; x++) {
      const [b, g, r] = pixel(x, yTop, w, h);
      buf[off++] = b; buf[off++] = g; buf[off++] = r;
    }
  }
  return buf;
}

function save(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log('written', path, buf.length, 'bytes');
}

save('build/installerSidebar.bmp', makeBMP(164, 314));
save('build/installerHeader.bmp', makeBMP(150, 57));
