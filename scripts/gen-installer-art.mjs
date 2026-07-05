// Премиальные BMP для NSIS-установщика (без сторонних зависимостей).
// installerSidebar: 164x314 — иллюстрация приветствия/финала
// installerHeader:  150x57  — шапка остальных страниц
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a, b, t) => a + (b - a) * t;
function add(p, r, g, b) { p[2] = clamp(p[2] + r); p[1] = clamp(p[1] + g); p[0] = clamp(p[0] + b); }

// Базовый фон — глубокий тёмно-синий градиент.
function bgPixel(x, y, w, h) {
  const t = y / h;
  const r = lerp(16, 9, t);
  const g = lerp(40, 13, t);
  const b = lerp(74, 24, t);
  return [clamp(b), clamp(g), clamp(r)]; // bgr
}

// Звёзды в верхней части неба.
function stars(p, x, y, w, h) {
  if (y > h * 0.55) return;
  const cx = Math.round(x / 3), cy = Math.round(y / 3);
  if (hash(cx, cy) > 0.985) {
    const tw = 0.5 + 0.5 * hash(cx + 5, cy);
    add(p, 150 * tw, 165 * tw, 180 * tw);
  }
}

// Северное сияние — две плавные ленты зелёно-бирюзового свечения.
function aurora(p, x, y, w, h) {
  const bands = [
    { base: 0.20, amp: 0.05, freq: 0.045, phase: 0.0, thick: 26, col: [40, 210, 150] },
    { base: 0.31, amp: 0.06, freq: 0.035, phase: 2.0, thick: 30, col: [60, 190, 210] },
  ];
  for (const bnd of bands) {
    const yc = (bnd.base + bnd.amp * Math.sin(x * bnd.freq + bnd.phase)) * h;
    const d = Math.abs(y - yc);
    if (d < bnd.thick) {
      const f = Math.pow(1 - d / bnd.thick, 2) * 0.5;
      add(p, bnd.col[0] * f * 0.4, bnd.col[1] * f, bnd.col[2] * f * 0.7);
    }
  }
}

// H-образный колледж (три башни) с окнами + лёгкое отражение.
function building(x, y, w, h) {
  const gY = h - 70;
  const towers = [
    { x0: 0.13 * w, x1: 0.35 * w, top: 0.52 * h },
    { x0: 0.39 * w, x1: 0.61 * w, top: 0.36 * h },
    { x0: 0.65 * w, x1: 0.87 * w, top: 0.58 * h },
  ];
  const bodyFor = (bx, by) => {
    for (const t of towers) {
      if (bx >= t.x0 && bx <= t.x1 && by >= t.top && by <= gY) {
        const edge = (bx - t.x0) / (t.x1 - t.x0);
        const shade = 0.82 + 0.3 * edge;
        const lx = bx - t.x0, ly = by - t.top;
        const inWin = (lx % 8) >= 2 && (lx % 8) <= 6 && (ly % 9) >= 2 && (ly % 9) <= 6;
        if (inWin) {
          const lit = hash(Math.floor(lx / 8) + t.x0, Math.floor(ly / 9)) > 0.6;
          if (lit) return [120, 205, 255];          // тёплое окно
          return [clamp(30 * shade), clamp(40 * shade), clamp(56 * shade)];
        }
        return [clamp(16 * shade), clamp(24 * shade), clamp(38 * shade)];
      }
    }
    return null;
  };
  // корпус
  const b = bodyFor(x, y);
  if (b) return b;
  // отражение под линией земли
  if (y > gY && y < gY + 26) {
    const mirrorY = gY - (y - gY) * 1.6;
    const rb = bodyFor(x, mirrorY);
    if (rb) { const f = 0.18 * (1 - (y - gY) / 26); return [clamp(rb[0] * f + 8), clamp(rb[1] * f + 10), clamp(rb[2] * f + 16)]; }
  }
  return null;
}

function makeBMP(w, h, full) {
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
      let px = bgPixel(x, yTop, w, h);
      aurora(px, x, yTop, w, h);
      if (full) {
        stars(px, x, yTop, w, h);
        const b = building(x, yTop, w, h);
        if (b) px = b;
      }
      // лёгкая виньетка
      const vx = (x / w - 0.5), vy = (yTop / h - 0.5);
      const vig = 1 - Math.min(1, (vx * vx + vy * vy) * 1.1) * 0.35;
      buf[off++] = clamp(px[0] * vig);
      buf[off++] = clamp(px[1] * vig);
      buf[off++] = clamp(px[2] * vig);
    }
  }
  return buf;
}

function save(path, buf) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, buf); console.log('written', path, buf.length, 'bytes'); }

save('build/installerSidebar.bmp', makeBMP(164, 314, true));
save('build/installerHeader.bmp', makeBMP(150, 57, false));
