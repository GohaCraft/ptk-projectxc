// ─────────────────────────────────────────────────────────────────────────────
//  ПРОЦЕДУРНЫЕ ТЕКСТУРЫ КАБИНЕТА (по фото)
//
//  Всё рисуется на канвасе при первом обращении и кэшируется. Фото-стенд и
//  плакаты сделаны НАМЕРЕННО «в плохом качестве»: похожие по тону цветовые
//  пятна/строки без какого-либо читаемого текста и лиц (как просил заказчик —
//  не возиться с реальными фото). Размеры канвасов маленькие (256–512) —
//  дёшево по памяти для киоска.
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

export interface ClassroomTextures {
  floor: THREE.Texture;    // ламинат «рыжеватое дерево»
  ceiling: THREE.Texture;  // подвесной потолок (плиты армстронг)
  cork: THREE.Texture;     // пробковый фото-стенд (размытый коллаж)
  poster: THREE.Texture;   // плакат-схема в рамке (нечитаемые строки)
  chalk: THREE.Texture;    // зелёная меловая доска
  window: THREE.Texture;   // светлое северное небо + силуэты домов
}

let cache: ClassroomTextures | null = null;

// детерминированный псевдослучай — текстуры одинаковы от запуска к запуску
function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function make(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  return t;
}

export function getClassroomTextures(): ClassroomTextures | null {
  if (typeof document === 'undefined') return null; // SSR-guard
  if (cache) return cache;

  // ── Ламинат ──
  const floor = make(256, 256, (c, w, h) => {
    const r = seeded(11);
    c.fillStyle = '#a9713f'; c.fillRect(0, 0, w, h);
    const plank = 32;
    for (let y = 0; y < h; y += plank) {
      for (let x = -plank; x < w + plank; x += 128) {
        const off = (y / plank) % 2 ? 64 : 0;
        const tone = 0.88 + r() * 0.24;
        c.fillStyle = `rgb(${Math.round(169 * tone)},${Math.round(113 * tone)},${Math.round(63 * tone)})`;
        c.fillRect(x + off, y, 126, plank - 1);
        // волокна
        c.strokeStyle = 'rgba(90,55,25,0.16)'; c.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.moveTo(x + off + r() * 60, y + r() * plank);
          c.lineTo(x + off + 60 + r() * 66, y + r() * plank);
          c.stroke();
        }
      }
    }
  });
  floor.wrapS = floor.wrapT = THREE.RepeatWrapping;

  // ── Подвесной потолок ──
  const ceiling = make(256, 256, (c, w, h) => {
    const r = seeded(23);
    c.fillStyle = '#f3f5f6'; c.fillRect(0, 0, w, h);
    // мелкая перфорация плит
    c.fillStyle = 'rgba(160,168,175,0.25)';
    for (let i = 0; i < 500; i++) c.fillRect(r() * w, r() * h, 1.4, 1.4);
    // каркас
    c.strokeStyle = '#c3cbd1'; c.lineWidth = 3;
    c.strokeRect(0, 0, w / 2, h / 2); c.strokeRect(w / 2, 0, w / 2, h / 2);
    c.strokeRect(0, h / 2, w / 2, h / 2); c.strokeRect(w / 2, h / 2, w / 2, h / 2);
  });
  ceiling.wrapS = ceiling.wrapT = THREE.RepeatWrapping;

  // ── Пробковый фото-стенд: размытые «фотографии» без деталей ──
  const cork = make(512, 320, (c, w, h) => {
    const r = seeded(37);
    // пробка
    c.fillStyle = '#b3854f'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      c.fillStyle = `rgba(${120 + r() * 60},${80 + r() * 45},${35 + r() * 30},0.35)`;
      c.fillRect(r() * w, r() * h, 2 + r() * 3, 1 + r() * 3);
    }
    // «фотографии» — мутные прямоугольники в фото-тонах (серые/синие/бежевые)
    const tones = ['#8e9aa6', '#6b7f95', '#a99d8a', '#7d8a79', '#9aa4b5', '#b0a08e', '#75808f', '#8f9b8b'];
    (c as any).filter = 'blur(2px)';
    for (let i = 0; i < 34; i++) {
      const pw = 46 + r() * 34, ph = 34 + r() * 26;
      const x = 8 + r() * (w - pw - 16), y = 8 + r() * (h - ph - 16);
      c.save();
      c.translate(x + pw / 2, y + ph / 2);
      c.rotate((r() - 0.5) * 0.16);
      c.fillStyle = '#e8e6e0'; c.fillRect(-pw / 2 - 2, -ph / 2 - 2, pw + 4, ph + 4); // белая кромка фото
      c.fillStyle = tones[Math.floor(r() * tones.length)];
      c.fillRect(-pw / 2, -ph / 2, pw, ph);
      // пара мутных пятен внутри («люди/парты» без деталей)
      for (let k = 0; k < 4; k++) {
        c.fillStyle = `rgba(${40 + r() * 120},${40 + r() * 110},${40 + r() * 100},0.4)`;
        c.fillRect(-pw / 2 + r() * pw * 0.7, -ph / 2 + r() * ph * 0.6, pw * 0.25, ph * 0.35);
      }
      c.restore();
    }
    (c as any).filter = 'none';
    // цветные «буквы» заголовка — просто мазки, не читается
    const hue = ['#d46a8c', '#5fae6f', '#c9a03a', '#5f87c9'];
    for (let i = 0; i < 14; i++) {
      c.fillStyle = hue[i % hue.length];
      c.fillRect(w * 0.36 + i * 10, h * 0.42 + (r() - 0.5) * 8, 6, 12 + r() * 6);
    }
    // кнопки-гвоздики
    for (let i = 0; i < 40; i++) {
      c.fillStyle = ['#e2b13c', '#c94f4f', '#4f77c9', '#4fa85f'][Math.floor(r() * 4)];
      c.beginPath(); c.arc(r() * w, r() * h, 2.4, 0, Math.PI * 2); c.fill();
    }
  });

  // ── Плакат-схема (белый лист, красноватая шапка, нечитаемые строки) ──
  const poster = make(256, 352, (c, w, h) => {
    const r = seeded(53);
    c.fillStyle = '#f5f3ee'; c.fillRect(0, 0, w, h);
    (c as any).filter = 'blur(1px)';
    // шапка
    c.fillStyle = 'rgba(170,60,50,0.75)';
    c.fillRect(w * 0.16, 14, w * 0.68, 16);
    // блоки-«схемы» со строками
    let y = 48;
    while (y < h - 24) {
      const bw = w * (0.3 + r() * 0.55);
      const bx = 12 + r() * (w - bw - 24);
      c.strokeStyle = 'rgba(150,60,50,0.5)'; c.lineWidth = 1.5;
      c.strokeRect(bx, y, bw, 26);
      c.fillStyle = 'rgba(90,90,95,0.6)';
      for (let i = 0; i < 3; i++) c.fillRect(bx + 5, y + 5 + i * 7, bw * (0.4 + r() * 0.5), 3);
      y += 34 + r() * 14;
    }
    (c as any).filter = 'none';
  });

  // ── Меловая доска ──
  const chalk = make(512, 256, (c, w, h) => {
    const r = seeded(71);
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#2c5a49'); g.addColorStop(0.5, '#316350'); g.addColorStop(1, '#2c5a49');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // разводы от тряпки
    for (let i = 0; i < 12; i++) {
      c.fillStyle = `rgba(215,225,220,${0.02 + r() * 0.03})`;
      c.beginPath();
      c.ellipse(r() * w, r() * h, 40 + r() * 60, 16 + r() * 22, (r() - 0.5), 0, Math.PI * 2);
      c.fill();
    }
    // пара нечитаемых меловых штрихов
    c.strokeStyle = 'rgba(235,240,238,0.32)'; c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      let x = 30 + r() * 120, y = 40 + r() * 60;
      c.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += 10 + r() * 16; y += (r() - 0.5) * 10; c.lineTo(x, y); }
      c.stroke();
    }
  });

  // ── Вид из окна: светлое небо, силуэты домов (север, пасмурно) ──
  const win = make(256, 256, (c, w, h) => {
    const r = seeded(89);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#eef3f6'); g.addColorStop(0.7, '#d5dfe6'); g.addColorStop(1, '#c2ccd4');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // дальние дома
    c.fillStyle = 'rgba(150,160,170,0.55)';
    let x = 0;
    while (x < w) {
      const bw = 26 + r() * 40, bh = 40 + r() * 55;
      c.fillRect(x, h - bh, bw, bh);
      x += bw + 6 + r() * 14;
    }
    // окошки домов
    c.fillStyle = 'rgba(220,228,232,0.5)';
    for (let i = 0; i < 60; i++) c.fillRect(r() * w, h - r() * 70, 3, 4);
  });

  cache = { floor, ceiling, cork, poster, chalk, window: win };
  return cache;
}
