'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ReactPdfFloorOverlayProps {
  url: string | null;            // PDF file URL, base64 data URI, or binary string
  opacity: number;               // Translucency overlay control
  scale: number;                 // Custom user scaling parameter
  offset: { x: number; z: number }; // Alignment offset on X and Z axes
  activeFloor: number;           // Selected floor (active height index)
  heightOffset?: number;         // Height tuning offset
  pageNumber?: number;           // Current page number to render from multi-page PDFs
}

const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Server side'));
      return;
    }
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => {
      const scriptFallback = document.createElement('script');
      scriptFallback.src = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.min.js';
      scriptFallback.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      scriptFallback.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(scriptFallback);
    };
    document.head.appendChild(script);
  });
};

export function ReactPdfFloorOverlay({
  url,
  opacity,
  scale,
  offset,
  activeFloor,
  heightOffset = 0,
  pageNumber = 1,
}: ReactPdfFloorOverlayProps) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1.414); // Default ratio
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!url || activeFloor > 4) {
      if (texture) {
        texture.dispose();
        setTexture(null);
      }
      return;
    }

    let isAborted = false;
    let renderTask: any = null;

    async function loadAndRender() {
      try {
        const pdfjsLib = await loadPdfJs();
        if (isAborted) return;

        let loadingTask;
        if (url && url.startsWith('data:application/pdf;base64,')) {
          const base64Data = url.split(',')[1];
          const binStr = atob(base64Data);
          const len = binStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binStr.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        } else if (url) {
          loadingTask = pdfjsLib.getDocument(url);
        } else {
          return;
        }

        const pdf = await loadingTask.promise;
        if (isAborted) return;

        const page = await pdf.getPage(pageNumber);
        if (isAborted) return;

        // Render at high resolution (width ~ 1600px)
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const desiredWidth = 1600;
        const renderScale = desiredWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale: renderScale });

        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (!context) return;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport
        });

        await renderTask.promise;
        if (isAborted) return;

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        if (canvas.width && canvas.height) {
          setAspectRatio(canvas.width / canvas.height);
        }

        setTexture((prev) => {
          if (prev) prev.dispose();
          return tex;
        });

      } catch (err) {
        console.error("Error loading or rendering PDF plan:", err);
      }
    }

    loadAndRender();

    return () => {
      isAborted = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, pageNumber, activeFloor]);

  // Clean texture on disposal
  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texture]);

  if (!url || activeFloor > 4) return null;

  const floorIdx = activeFloor - 1;
  const floorY = 1.5 + floorIdx * 2.9 + 0.24 + heightOffset;

  const baseScaleModifier = 440 * scale; 
  const planeWidth = baseScaleModifier * aspectRatio;
  const planeHeight = baseScaleModifier;

  return (
    <group>
      {/* Hidden DOM canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {texture && (
        <mesh 
          position={[offset.x, floorY, offset.z]} 
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[planeWidth, planeHeight]} />
          <meshBasicMaterial 
            map={texture} 
            transparent 
            opacity={opacity} 
            depthWrite={false} 
            side={THREE.DoubleSide}
            color="#ffffff" 
          />
        </mesh>
      )}
    </group>
  );
}

export default ReactPdfFloorOverlay;
