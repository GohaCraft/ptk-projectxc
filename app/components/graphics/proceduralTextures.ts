import * as THREE from "three";

// Процедурная генерация текстур (canvas) — без React. Вынесено из Materials.tsx.
export type TextureSet = {
  concreteMap: THREE.CanvasTexture;     // Плиты штукатурки
  concreteBump: THREE.CanvasTexture;    // Карта рельефа штукатурки
  stuccoMap: THREE.CanvasTexture;       // Бордовая шуба (цоколь) — текстура цвета
  stuccoBump: THREE.CanvasTexture;      // Бордовая шуба — карта высот/рельефа
  metalRoughness: THREE.CanvasTexture;  // Микро-шероховатость металла
  brickMap: THREE.CanvasTexture;        // Красный кирпич — цвет кусков
  brickBump: THREE.CanvasTexture;       // Красный кирпич — швы и рельеф кирпичной кладки
  akpMap: THREE.CanvasTexture;          // Композитные панели АКП (козырьки/откосы)
  beltMap: THREE.CanvasTexture;         // Светло-серый бетонный пояс над цоколем
  groundMap: THREE.CanvasTexture;       // Плотный укатаный снег перед колледжем
  blockStripeMap: THREE.CanvasTexture;  // Сигнальные полосы парковочных столбиков (оранжевый/серый)
  dirtyRubberMap: THREE.CanvasTexture;  // Грязный текстурированный резиновый коврик ступеней
  rampFloorMap: THREE.CanvasTexture;    // Перфорированный настил пандуса
  rampFloorAlphaMap: THREE.CanvasTexture; // Карта прозрачности отверстий настила пандуса
};

let globalTexturesV2: TextureSet | null = null;

export function getProceduralTextures(): TextureSet | null {
  if (typeof window === "undefined") return null;
  if (globalTexturesV2) return globalTexturesV2;

  // 1. Белая мягкая кисть для высот и бликов (32x32)
  const bWhite = document.createElement("canvas");
  bWhite.width = 32; bWhite.height = 32;
  const ctxW = bWhite.getContext("2d")!;
  const gradW = ctxW.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradW.addColorStop(0, "rgba(255,255,255,1)");
  gradW.addColorStop(0.5, "rgba(210,210,210,0.7)");
  gradW.addColorStop(1, "rgba(136,136,136,0)");
  ctxW.fillStyle = gradW;
  ctxW.fillRect(0, 0, 32, 32);

  // 2. Черная мягкая кисть для углублений и теней (32x32)
  const bBlack = document.createElement("canvas");
  bBlack.width = 32; bBlack.height = 32;
  const ctxBlk = bBlack.getContext("2d")!;
  const gradBlk = ctxBlk.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradBlk.addColorStop(0, "rgba(0,0,0,1)");
  gradBlk.addColorStop(0.5, "rgba(30,30,30,0.5)");
  gradBlk.addColorStop(1, "rgba(102,102,102,0)");
  ctxBlk.fillStyle = gradBlk;
  ctxBlk.fillRect(0, 0, 32, 32);

  // 1. PANEL of B1/B2 wings — gritty grey-olive plaster ("крошка")
  const cP = document.createElement("canvas");
  cP.width = 2048; cP.height = 2048;
  const ctxP = cP.getContext("2d")!;

  const gradP = ctxP.createLinearGradient(0, 0, 0, 2048);
  gradP.addColorStop(0,    "#7E7E6A");
  gradP.addColorStop(0.5,  "#70705C");
  gradP.addColorStop(1,    "#5C5C4A");
  ctxP.fillStyle = gradP;
  ctxP.fillRect(0, 0, 2048, 2048);

  for (let i = 0; i < 75000; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 2048;
    const r = Math.random() * 3.8 + 0.6;
    const v = Math.random();
    let col: string;
    if (v < 0.15)      col = `rgba(40,38,30,${0.32 + Math.random() * 0.4})`;        // dark chips
    else if (v < 0.30) col = `rgba(180,178,160,${0.28 + Math.random() * 0.35})`;   // light chips
    else if (v < 0.45) col = `rgba(110,108,90,${0.32 + Math.random() * 0.4})`;      // mid chips
    else if (v < 0.55) col = `rgba(150,140,100,${0.22 + Math.random() * 0.3})`;     // warm chips
    else               col = `rgba(95,93,80,${0.22 + Math.random() * 0.3})`;         // base chips
    
    ctxP.fillStyle = col;
    ctxP.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 2048;
    const w = 2 + Math.random() * 5;
    const h = 400 + Math.random() * 1000;
    const y0 = Math.random() * 600;
    ctxP.fillStyle = `rgba(35,30,25,${0.07 + Math.random() * 0.12})`;
    ctxP.fillRect(x, y0, w, h);
  }

  for (let i = 0; i < 24; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 2048;
    const r = 60 + Math.random() * 150;
    const grad = ctxP.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(50,45,38,${0.09 + Math.random() * 0.12})`);
    grad.addColorStop(1, "rgba(50,45,38,0)");
    ctxP.fillStyle = grad;
    ctxP.beginPath(); ctxP.arc(x, y, r, 0, Math.PI * 2); ctxP.fill();
  }

  const drawSeam = (x1: number, y1: number, x2: number, y2: number) => {
    ctxP.strokeStyle = "rgba(0,0,0,0.6)";
    ctxP.lineWidth = 5;
    ctxP.beginPath(); ctxP.moveTo(x1, y1); ctxP.lineTo(x2, y2); ctxP.stroke();
    ctxP.strokeStyle = "rgba(60,55,45,0.45)";
    ctxP.lineWidth = 2;
    ctxP.beginPath(); ctxP.moveTo(x1 + 1, y1 + (y1 === y2 ? 0 : 1)); ctxP.lineTo(x2 + 1, y2 + (y1 === y2 ? 0 : 1)); ctxP.stroke();
  };
  drawSeam(1024, 0, 1024, 2048);   // vertical mid
  drawSeam(0, 1024, 2048, 1024);   // horizontal mid
  drawSeam(0, 0, 2048, 0);         // top edge
  drawSeam(0, 2048, 2048, 2048);   // bottom edge

  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 160;
    ctxP.fillStyle = `rgba(180,140,80,${0.35 + Math.random() * 0.35})`;
    ctxP.fillRect(x, y, 2 + Math.random() * 3, 4 + Math.random() * 6);
  }

  const concreteMap = new THREE.CanvasTexture(cP);
  concreteMap.wrapS = concreteMap.wrapT = THREE.RepeatWrapping;
  concreteMap.colorSpace = THREE.SRGBColorSpace;
  concreteMap.anisotropy = 16;

  const cPB = document.createElement("canvas");
  cPB.width = 2048; cPB.height = 2048;
  const ctxPB = cPB.getContext("2d")!;
  ctxPB.fillStyle = "#888"; ctxPB.fillRect(0, 0, 2048, 2048);

  for (let i = 0; i < 45000; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 2048;
    const r = Math.random() * 3.5 + 0.8;
    ctxPB.globalAlpha = 0.2 + Math.random() * 0.8;
    ctxPB.drawImage(bWhite, x - r, y - r, r * 2, r * 2);
  }
  ctxPB.globalAlpha = 1.0;

  ctxPB.strokeStyle = "#151515"; ctxPB.lineWidth = 8;
  ctxPB.beginPath(); ctxPB.moveTo(1024, 0); ctxPB.lineTo(1024, 2048); ctxPB.stroke();
  ctxPB.beginPath(); ctxPB.moveTo(0, 1024); ctxPB.lineTo(2048, 1024); ctxPB.stroke();

  const concreteBump = new THREE.CanvasTexture(cPB);
  concreteBump.wrapS = concreteBump.wrapT = THREE.RepeatWrapping;
  concreteBump.anisotropy = 16;

  // 2. ШУБА — bordeaux-brown coarse plaster of the plinth
  const cS = document.createElement("canvas");
  cS.width = 2048; cS.height = 1024;
  const ctxS = cS.getContext("2d")!;

  const gradS = ctxS.createLinearGradient(0, 0, 0, 1024);
  gradS.addColorStop(0,   "#7E4848");
  gradS.addColorStop(0.7, "#6E3838");
  gradS.addColorStop(1,   "#5A2828");
  ctxS.fillStyle = gradS;
  ctxS.fillRect(0, 0, 2048, 1024);

  for (let i = 0; i < 24000; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 1024;
    const r = 4.0 + Math.random() * 10.0;
    const v = Math.random();
    let baseCol: string;
    if (v < 0.35)      baseCol = "#6E3838";
    else if (v < 0.6)  baseCol = "#5A2828";
    else if (v < 0.8)  baseCol = "#8C5050";
    else if (v < 0.92) baseCol = "#3E1A1A";
    else               baseCol = "#9C6060";
    
    ctxS.fillStyle = baseCol;
    ctxS.fillRect(x - r, y - r, r * 2, r * 2);
    
    if (Math.random() > 0.25) {
      ctxS.globalAlpha = 0.25 + Math.random() * 0.35;
      ctxS.drawImage(bWhite, x - r * 0.4 - r * 0.45, y - r * 0.4 - r * 0.45, r * 0.9, r * 0.9);
    }
    if (Math.random() > 0.3) {
      ctxS.globalAlpha = 0.3 + Math.random() * 0.35;
      ctxS.drawImage(bBlack, x + r * 0.4 - r * 0.5, y + r * 0.4 - r * 0.5, r, r);
    }
  }
  ctxS.globalAlpha = 1.0;

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 2048;
    const w = 3 + Math.random() * 6;
    const h = 200 + Math.random() * 700;
    ctxS.fillStyle = `rgba(20,8,8,${0.14 + Math.random() * 0.22})`;
    ctxS.fillRect(x, 0, w, h);
  }

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 2048;
    const y = 800 + Math.random() * 220;
    const r = 15 + Math.random() * 45;
    const grad = ctxS.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(200,180,170,0.22)");
    grad.addColorStop(1, "rgba(200,180,170,0)");
    ctxS.fillStyle = grad;
    ctxS.beginPath(); ctxS.arc(x, y, r, 0, Math.PI * 2); ctxS.fill();
  }

  const stuccoMap = new THREE.CanvasTexture(cS);
  stuccoMap.wrapS = stuccoMap.wrapT = THREE.RepeatWrapping;
  stuccoMap.colorSpace = THREE.SRGBColorSpace;
  stuccoMap.anisotropy = 16;

  const cB = document.createElement("canvas");
  cB.width = 2048; cB.height = 1024;
  const ctxB = cB.getContext("2d")!;
  ctxB.fillStyle = "#666";
  ctxB.fillRect(0, 0, 2048, 1024);
  
  for (let i = 0; i < 24000; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 1024;
    const r = Math.random() * 11 + 4.0;
    
    ctxB.globalAlpha = 0.85;
    ctxB.drawImage(bWhite, x - r * 0.2 - r, y - r * 0.2 - r, r * 2, r * 2);
    
    ctxB.globalAlpha = 0.75;
    ctxB.drawImage(bBlack, x + r * 0.4 - r * 0.7, y + r * 0.4 - r * 0.7, r * 1.4, r * 1.4);
  }
  ctxB.globalAlpha = 1.0;
  
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 2048;
    const y = Math.random() * 1024;
    const r = Math.random() * 3 + 0.6;
    const v = Math.random() > 0.5 ? 240 : 30;
    ctxB.fillStyle = `rgba(${v},${v},${v},0.85)`;
    ctxB.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const stuccoBump = new THREE.CanvasTexture(cB);
  stuccoBump.wrapS = stuccoBump.wrapT = THREE.RepeatWrapping;
  stuccoBump.anisotropy = 16;

  // 3. METAL micro-roughness
  const cM = document.createElement("canvas");
  cM.width = 256; cM.height = 256;
  const ctxM = cM.getContext("2d")!;
  ctxM.fillStyle = "#a8a8a8";
  ctxM.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const c = 130 + Math.floor(Math.random() * 100);
    ctxM.fillStyle = `rgb(${c},${c},${c})`;
    ctxM.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 30; i++) {
    ctxM.fillStyle = "rgba(80,80,80,0.25)";
    ctxM.fillRect(Math.random() * 256, Math.random() * 256, 1, 5 + Math.random() * 30);
  }
  const metalRoughness = new THREE.CanvasTexture(cM);
  metalRoughness.wrapS = metalRoughness.wrapT = THREE.RepeatWrapping;
  metalRoughness.repeat.set(4, 4);

  // 4. BRICK — red brick of Лит. Б
  const cBr = document.createElement("canvas");
  cBr.width = 1024; cBr.height = 1024;
  const ctxBr = cBr.getContext("2d")!;
  const cBmp = document.createElement("canvas");
  cBmp.width = 1024; cBmp.height = 1024;
  const ctxBmp = cBmp.getContext("2d")!;

  ctxBr.fillStyle = "#65605C"; 
  ctxBr.fillRect(0, 0, 1024, 1024);
  ctxBmp.fillStyle = "#101010";
  ctxBmp.fillRect(0, 0, 1024, 1024);

  const tileW = 512, tileH = 128, padding = 8;
  const cols = Math.floor(1024 / tileW);
  const rows = Math.floor(1024 / tileH);
  const bw = tileW - padding;
  const bh = tileH - padding;

  for (let r = 0; r < rows; r++) {
    const y = r * tileH;
    const offsetX = (r % 2) * (tileW / 2);
    for (let c = 0; c < cols; c++) {
      const x = c * tileW + offsetX;
      
      const hue = 8 + Math.random() * 8;
      const sat = 45 + Math.random() * 20;
      const lit = 35 + Math.random() * 12;
      const color = `hsl(${hue}, ${sat}%, ${lit}%)`;
      const bumpHsl = `hsl(0, 0%, ${65 + Math.random() * 20}%)`;

      const noise = new Float32Array(bw * bh);
      for(let i = 0; i < noise.length; i++) noise[i] = (Math.random() - 0.5) * 12;

      const bcv = document.createElement("canvas");
      bcv.width = bw; bcv.height = bh;
      const bctx = bcv.getContext("2d")!;
      bctx.fillStyle = color;
      bctx.fillRect(0, 0, bw, bh);
      const img = bctx.getImageData(0, 0, bw, bh);
      for(let p = 0; p < bw*bh; p++) {
          const idx = p * 4;
          const n = noise[p];
          img.data[idx] = Math.max(0, Math.min(255, img.data[idx] + n));
          img.data[idx+1] = Math.max(0, Math.min(255, img.data[idx+1] + n * 0.7));
          img.data[idx+2] = Math.max(0, Math.min(255, img.data[idx+2] + n * 0.5));
      }
      bctx.putImageData(img, 0, 0);

      const drawB = (dx: number, dy: number) => {
        ctxBr.drawImage(bcv, dx, dy);
        ctxBmp.fillStyle = bumpHsl;
        ctxBmp.fillRect(dx, dy, bw, bh);
      };

      const positions = [[x, y]];
      if (x + bw > 1024) positions.push([x - 1024, y]);
      
      for(const [px, py] of positions) drawB(px, py);
    }
  }

  for (let i = 0; i < 25; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 20 + Math.random() * 50;
    const grad = ctxBr.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(220,210,200,0.18)");
    grad.addColorStop(1, "rgba(220,210,200,0)");
    ctxBr.fillStyle = grad;
    for (const ox of [-1024, 0, 1024]) {
      for (const oy of [-1024, 0, 1024]) {
        ctxBr.beginPath(); ctxBr.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctxBr.fill();
      }
    }
  }

  for (let i = 0; i < 12; i++) {
    const x = Math.random() * 1024;
    const w = 2 + Math.random() * 3;
    const h = 200 + Math.random() * 600;
    ctxBr.fillStyle = `rgba(20,10,5,${0.08 + Math.random() * 0.1})`;
    for (const ox of [-1024, 0, 1024]) {
      for (const oy of [-1024, 0, 1024]) {
        ctxBr.fillRect(x + ox, oy, w, h);
      }
    }
  }

  const brickMap = new THREE.CanvasTexture(cBr);
  brickMap.wrapS = brickMap.wrapT = THREE.RepeatWrapping;
  brickMap.colorSpace = THREE.SRGBColorSpace;
  brickMap.anisotropy = 8;

  const brickBump = new THREE.CanvasTexture(cBmp);
  brickBump.wrapS = brickBump.wrapT = THREE.RepeatWrapping;
  brickBump.anisotropy = 8;

  // 5. ACP composite panels for canopy
  const cA = document.createElement("canvas");
  cA.width = 512; cA.height = 512;
  const ctxA = cA.getContext("2d")!;
  ctxA.fillStyle = "#C2C8CC";
  ctxA.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8000; i++) {
    const c = 184 + Math.floor(Math.random() * 30);
    ctxA.fillStyle = `rgba(${c},${c + 4},${c + 8},0.6)`;
    ctxA.fillRect(Math.random() * 512, Math.random() * 512, 1, 1 + Math.random());
  }
  for (let y = 0; y < 512; y += 2) {
    ctxA.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
    ctxA.fillRect(0, y, 512, 1);
  }
  ctxA.strokeStyle = "#7D8388"; ctxA.lineWidth = 2;
  ctxA.beginPath(); ctxA.moveTo(256, 0); ctxA.lineTo(256, 512); ctxA.stroke();
  ctxA.beginPath(); ctxA.moveTo(0, 256); ctxA.lineTo(512, 256); ctxA.stroke();
  ctxA.strokeStyle = "rgba(0,0,0,0.3)"; ctxA.lineWidth = 1;
  ctxA.beginPath(); ctxA.moveTo(257, 0); ctxA.lineTo(257, 512); ctxA.stroke();
  ctxA.beginPath(); ctxA.moveTo(0, 257); ctxA.lineTo(512, 257); ctxA.stroke();

  const akpMap = new THREE.CanvasTexture(cA);
  akpMap.wrapS = akpMap.wrapT = THREE.RepeatWrapping;
  akpMap.colorSpace = THREE.SRGBColorSpace;

  // 6. BELT — light grey concrete belt above plinth
  const cBl = document.createElement("canvas");
  cBl.width = 256; cBl.height = 64;
  const ctxBl = cBl.getContext("2d")!;
  ctxBl.fillStyle = "#9B928A";
  ctxBl.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 1500; i++) {
    const c = 130 + Math.floor(Math.random() * 60);
    ctxBl.fillStyle = `rgb(${c},${c - 4},${c - 8})`;
    ctxBl.fillRect(Math.random() * 256, Math.random() * 64, 1, 1);
  }
  for (let i = 0; i < 25; i++) {
    ctxBl.fillStyle = "rgba(40,30,30,0.3)";
    ctxBl.fillRect(Math.random() * 256, Math.random() * 64, 1 + Math.random() * 4, 1);
  }
  const beltMap = new THREE.CanvasTexture(cBl);
  beltMap.wrapS = beltMap.wrapT = THREE.RepeatWrapping;
  beltMap.colorSpace = THREE.SRGBColorSpace;

  // 7. SNOW GROUND
  const cG = document.createElement("canvas");
  cG.width = 1024; cG.height = 1024;
  const ctxG = cG.getContext("2d")!;
  ctxG.fillStyle = "#E2E6EA";
  ctxG.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const c = 215 + Math.floor(Math.random() * 40);
    ctxG.fillStyle = `rgba(${c},${c + 1},${c + 4},${0.4 + Math.random() * 0.4})`;
    ctxG.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 8 + Math.random() * 30;
    const grad = ctxG.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(140,140,150,${0.15 + Math.random() * 0.2})`);
    grad.addColorStop(1, "rgba(140,140,150,0)");
    ctxG.fillStyle = grad;
    ctxG.beginPath(); ctxG.arc(x, y, r, 0, Math.PI * 2); ctxG.fill();
  }
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctxG.fillStyle = `rgba(180,150,90,${0.05 + Math.random() * 0.07})`;
    ctxG.fillRect(x, y, 50 + Math.random() * 100, 5 + Math.random() * 15);
  }
  const groundMap = new THREE.CanvasTexture(cG);
  groundMap.wrapS = groundMap.wrapT = THREE.RepeatWrapping;
  groundMap.repeat.set(20, 20);
  groundMap.colorSpace = THREE.SRGBColorSpace;

  // 8. BOLLARD STRIPES
  const cStr = document.createElement("canvas");
  cStr.width = 256; cStr.height = 256;
  const ctxStr = cStr.getContext("2d")!;
  ctxStr.fillStyle = "#9C9994";
  ctxStr.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * 80;
    const grad = ctxStr.createLinearGradient(x, 0, x + 40, 0);
    grad.addColorStop(0,    "#C04D22");
    grad.addColorStop(0.5,  "#E55A2B");
    grad.addColorStop(1,    "#C04D22");
    ctxStr.fillStyle = grad;
    ctxStr.fillRect(x, 0, 40, 256);
  }
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const c = Math.floor(Math.random() * 80);
    ctxStr.fillStyle = `rgba(${c},${c},${c},${0.05 + Math.random() * 0.1})`;
    ctxStr.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 200; i++) {
    ctxStr.fillStyle = `rgba(40,30,20,${0.05 + Math.random() * 0.1})`;
    ctxStr.fillRect(Math.random() * 256, 200 + Math.random() * 56, 1 + Math.random() * 4, 1);
  }
  for (let i = 0; i < 8; i++) {
    ctxStr.fillStyle = `rgba(50,30,15,${0.08 + Math.random() * 0.1})`;
    ctxStr.fillRect(Math.random() * 256, 0, 1 + Math.random() * 2, 256);
  }
  const blockStripeMap = new THREE.CanvasTexture(cStr);
  blockStripeMap.wrapS = blockStripeMap.wrapT = THREE.ClampToEdgeWrapping;
  blockStripeMap.colorSpace = THREE.SRGBColorSpace;

  // 9. DIRT RUBBER TREADS
  const cRub = document.createElement("canvas");
  cRub.width = 512;
  cRub.height = 512;
  const ctxRub = cRub.getContext("2d")!;
  ctxRub.fillStyle = "#802621";
  ctxRub.fillRect(0, 0, 512, 512);

  ctxRub.fillStyle = "#651a17";
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctxRub.fillRect(x, y, 2, 2);
  }
  
  ctxRub.fillStyle = "#3a3028"; 
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 30 + 10;
    ctxRub.beginPath();
    ctxRub.arc(x, y, radius, 0, 2 * Math.PI);
    ctxRub.globalAlpha = Math.random() * 0.4 + 0.1;
    ctxRub.fill();
  }
  ctxRub.globalAlpha = 1.0;

  const dirtyRubberMap = new THREE.CanvasTexture(cRub);
  dirtyRubberMap.wrapS = dirtyRubberMap.wrapT = THREE.RepeatWrapping;
  dirtyRubberMap.colorSpace = THREE.SRGBColorSpace;
  dirtyRubberMap.anisotropy = 4;

  // 10. RAMP METALLIC FLOORS
  const cRmp = document.createElement("canvas");
  cRmp.width = 128; cRmp.height = 128;
  const ctxRmp = cRmp.getContext("2d")!;
  
  const cRmpAlpha = document.createElement("canvas");
  cRmpAlpha.width = 128; cRmpAlpha.height = 128;
  const ctxRmpAlpha = cRmpAlpha.getContext("2d")!;
  
  const drawPatternRamp = (context: CanvasRenderingContext2D, holeColor: string, solidColor: string) => {
    context.fillStyle = solidColor;
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = holeColor;
    
    const w = 32;
    const h = 16;
    const hw = 15;
    const hh = 6;
    
    for (let y = 0; y <= 128 + h; y += h) {
      for (let x = 0; x <= 128 + w; x += w) {
        const offsetX = (y % (h * 2) === 0) ? 0 : w / 2;
        const cx = x + offsetX;
        const cy = y;
        
        context.beginPath();
        context.moveTo(cx - hw, cy);
        context.bezierCurveTo(cx - hw/2, cy - hh, cx + hw/2, cy - hh, cx + hw, cy);
        context.bezierCurveTo(cx + hw/2, cy + hh, cx - hw/2, cy + hh, cx - hw, cy);
        context.fill();
      }
    }
  };
  
  drawPatternRamp(ctxRmp, "#3a1f1b", "#b35144");
  drawPatternRamp(ctxRmpAlpha, "#000000", "#ffffff");
  
  for (let i = 0; i < 800; i++) {
    ctxRmp.fillStyle = Math.random() > 0.5 ? "#612a23" : "#d46a5b";
    ctxRmp.globalAlpha = Math.random() * 0.6;
    ctxRmp.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  ctxRmp.globalAlpha = 1.0;
  
  const rampFloorMap = new THREE.CanvasTexture(cRmp);
  rampFloorMap.wrapS = rampFloorMap.wrapT = THREE.RepeatWrapping;
  rampFloorMap.colorSpace = THREE.SRGBColorSpace;
  
  const rampFloorAlphaMap = new THREE.CanvasTexture(cRmpAlpha);
  rampFloorAlphaMap.wrapS = rampFloorAlphaMap.wrapT = THREE.RepeatWrapping;

  globalTexturesV2 = {
    concreteMap, concreteBump,
    stuccoMap, stuccoBump,
    metalRoughness,
    brickMap, brickBump,
    akpMap, beltMap, groundMap, blockStripeMap,
    dirtyRubberMap, rampFloorMap, rampFloorAlphaMap,
  };
  return globalTexturesV2;
}
