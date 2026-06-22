// Генерирует фирменные BMP для NSIS-установщика без сторонних зависимостей.
// installerSidebar: 164x314 (страница приветствия/завершения) — с силуэтом здания
// installerHeader:  150x57  (шапка остальных страниц)
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }

// Силуэт H-образного колледжа (три башни) у нижней части боковой картинки.
// Возвращает [b,g,r] для пикселя здания/окна, либо null.
function building(x, y, w, h) {
  const gY = h - 78;            // линия земли
  if (y > gY) {
    // мягкая «земля» (чуть темнее)
    return [10, 12, 18];
  }
  const towers = [
    { x0: 0.14 * w, x1: 0.36 * w, top: 0.50 * h }, // левое крыло
    { x0: 0.40 * w, x1: 0.62 * w, top: 0.34 * h }, // центр (выше)
    { x0: 0.66 * w, x1: 0.88 * w, top: 0.56 * h }, // правое крыло
  ];
  for (const t of towers) {
    if (x >= t.x0 && x <= t.x1 && y >= t.top && y <= gY) {
      // корпус — тёмный сине-графитовый силуэт с лёгким боковым затенением
      const edge = (x - t.x0) / (t.x1 - t.x0);
      const shade = 0.85 + 0.25 * edge;
      // сетка окон
      const lx = x - t.x0, ly = y - t.top;
      const cellX = Math.floor(lx / 8), cellY = Math.floor(ly / 9);
      const inWinX = (lx % 8) >= 2 && (lx % 8) <= 6;
      const inWinY = (ly % 9) >= 2 && (ly % 9) <= 6;
      if (inWinX && inWinY) {
        const lit = hash(cellX + t.x0, cellY) > 0.62;
        if (lit) return [clamp(120), clamp(205), clamp(255)]; // тёплое окно (bgr)
        return [clamp(26 * shade), clamp(34 * shade), clamp(48 * shade)]; // тёмное окно
      }
      return [clamp(16 * shade), clamp(24 * shade), clamp(38 * shade)]; // стена
    }
  }
  return null;
}

// Фон — фирменный тёмно-синий градиент с мягким сиянием (северное сияние).
function bg(x, y, w, h) {
  const t = y / h;
  const baseR = 10 + (16 - 10) * (1 - t);
  const baseG = 14 + (44 - 14) * (1 - t);
  const baseB = 26 + (80 - 26) * (1 - t);
  const cx = w * 0.34, cy = h * 0.24;
  const d = Math.hypot(x - cx, y - cy) / Math.hypot(w, h);
  const glow = Math.max(0, 0.58 - d) * 130;
  return [
    clamp(baseB + glow * 1.0),
    clamp(baseG + glow * 0.78),
    clamp(baseR + glow * 0.32),
  ];
}

function makeBMP(w, h, withBuilding) {
  const rowSize = Math.floor((24 * w + 31) / 32) * 4;
  const pixelArraySize = rowSize * h;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);

  for (let row = 0; row < h; row++) {
    const yTop = h - 1 - row;
    let off = 54 + row * rowSize;
    for (let x = 0; x < w; x++) {
      let px = null;
      if (withBuilding) px = building(x, yTop, w, h);
      if (!px) px = bg(x, yTop, w, h);
      buf[off++] = px[0]; buf[off++] = px[1]; buf[off++] = px[2];
    }
  }
  return buf;
}

function save(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log('written', path, buf.length, 'bytes');
}

save('build/installerSidebar.bmp', makeBMP(164, 314, true));
save('build/installerHeader.bmp', makeBMP(150, 57, false));
