"use client";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
// РАЗМЕРЫ ЗДАНИЯ В МИРОВЫХ КООРДИНАТАХ (метры)
// Б1: center[-22.78, 9.415]  Б: center[0,0]  Б2: center[21.305,-3.085]
const BLDG = {
  xMin: -30.905, xMax: 27.955,  // ширина 58.86м
  zMin: -24.670, zMax: 37.650,  // глубина 62.32м
};
const BLDG_W  = BLDG.xMax - BLDG.xMin;   // 58.86
const BLDG_D  = BLDG.zMax - BLDG.zMin;   // 62.32
const CENTER_X = (BLDG.xMin + BLDG.xMax) / 2; // -1.475
const CENTER_Z = (BLDG.zMin + BLDG.zMax) / 2; //  6.490

// Масштаб рендера PDF (2 = 144 DPI — хорошее соотношение качество/память)
const PDF_SCALE = 2.5;
// Страница 1-го этажа в техпаспорте (1-indexed)
const FLOOR1_PAGE = 18;

// ─────────────────────────────────────────────────────────────
// Загружает pdf.js из CDN (уже используется в проекте)
async function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    s.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(lib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─────────────────────────────────────────────────────────────
// Рендерит страницу PDF в canvas и возвращает THREE.CanvasTexture
// cropFraction: { left, top, right, bottom } — доля страницы (0..1)
// чтобы обрезать поля и угловой штамп
async function renderPdfPage(
  pdfUrl: string,
  pageNum: number,
  scale: number,
  crop: { left: number; top: number; right: number; bottom: number }
): Promise<THREE.CanvasTexture | null> {
  try {
    const pdfjs = await loadPdfJs();
    const pdf   = await pdfjs.getDocument(pdfUrl).promise;
    const page  = await pdf.getPage(pageNum);

    const vp = page.getViewport({ scale });
    const pw = vp.width;
    const ph = vp.height;

    // Рендерим полную страницу в offscreen-canvas
    const full = document.createElement('canvas');
    full.width  = pw;
    full.height = ph;
    const ctx = full.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    // Вырезаем рабочее поле (убираем рамку и штамп)
    const sx = Math.floor(pw * crop.left);
    const sy = Math.floor(ph * crop.top);
    const sw = Math.floor(pw * (1 - crop.left - crop.right));
    const sh = Math.floor(ph * (1 - crop.top  - crop.bottom));

    const cropped = document.createElement('canvas');
    cropped.width  = sw;
    cropped.height = sh;
    const ctx2 = cropped.getContext('2d')!;
    ctx2.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);

    const tex = new THREE.CanvasTexture(cropped);
    tex.colorSpace  = THREE.SRGBColorSpace;
    tex.anisotropy  = 8;
    tex.needsUpdate = true;
    return tex;
  } catch (e) {
    console.warn('[FloorBlueprintPDF] ошибка рендера:', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Компонент — плоскость на полу с текстурой чертежа БТИ
// pdfUrl — URL к PDF в /public/ папке проекта
// Поля crop подобраны под реальный лист техпаспорта:
//   - поле слева/сверху ~5%
//   - угловой штамп снизу-справа ~15% по высоте, ~22% по ширине
// ─────────────────────────────────────────────────────────────
export function FloorBlueprintPDF({
  pdfUrl    = '/blueprint_floor1.pdf',
  visible   = true,
  opacity   = 0.82,
  yOffset   = 0.04,
}: {
  pdfUrl?:  string;
  visible?: boolean;
  opacity?: number;
  yOffset?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    // Crop подобран под стандартный лист техпаспорта с угловым штампом
    renderPdfPage(pdfUrl, FLOOR1_PAGE, PDF_SCALE, {
      left:   0.04,  // левое поле
      top:    0.03,  // верхнее поле
      right:  0.04,  // правое поле
      bottom: 0.17,  // угловой штамп + нижнее поле
    }).then((t) => {
      if (!cancelled && t) {
        setTex(t);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, visible]);

  useEffect(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (mat && tex) {
      mat.map     = tex;
      mat.opacity = opacity;
      mat.needsUpdate = true;
    }
  }, [tex, opacity]);

  if (!visible) return null;

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[CENTER_X, yOffset, CENTER_Z]}
    >
      {/* Плоскость точно покрывает весь габарит здания */}
      <planeGeometry args={[BLDG_W, BLDG_D]} />
      <meshBasicMaterial
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        color={0xffffff}
      />
    </mesh>
  );
}
