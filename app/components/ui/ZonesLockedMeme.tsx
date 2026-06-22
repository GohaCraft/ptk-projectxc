"use client";

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Пасхалка «six seven»: когда зоны отключены (APP_SETTINGS.zonesEnabled=false)
 * и пользователь тыкает по 3D-модели — всплывают две качающиеся руки:
 * слева «ЗОНЫ», справа «ЗАБЛОКИРОВАНЫ» (как жест из мема 6-7, вверх-вниз).
 *
 * Слушатели пассивные и не мешают вращению модели (OrbitControls):
 * реагируем только на короткий тап ПО САМОМУ canvas (не по меню).
 */
export default function ZonesLockedMeme() {
  const [show, setShow] = useState(false);
  const down = useRef<{ x: number; y: number; onCanvas: boolean }>({ x: 0, y: 0, onCanvas: false });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      down.current = { x: e.clientX, y: e.clientY, onCanvas: !!t && t.tagName === 'CANVAS' };
    };
    const onUp = (e: PointerEvent) => {
      if (!down.current.onCanvas) return;
      const dist = Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y);
      if (dist > 8) return; // это было вращение/перетаскивание — не мем
      setShow(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShow(false), 3000);
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const bob = (up: boolean) => ({
    animate: { y: up ? [-22, 22] : [22, -22], rotate: up ? [-6, 6] : [6, -6] },
    transition: { repeat: Infinity, repeatType: 'reverse' as const, duration: 0.5, ease: 'easeInOut' as const },
  });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
        >
          {/* затемнение */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

          <div className="relative flex items-end gap-12 md:gap-20 select-none">
            {/* Левая рука — ЗОНЫ */}
            <motion.div {...bob(true)} className="flex flex-col items-center gap-3">
              <span className="text-7xl md:text-8xl" style={{ transform: 'scaleX(-1)' }}>✋</span>
              <span className="px-4 py-1.5 rounded-xl bg-sky-500/90 text-white font-black text-lg md:text-2xl tracking-wide shadow-lg">
                ЗОНЫ
              </span>
            </motion.div>

            {/* Правая рука — ЗАБЛОКИРОВАНЫ */}
            <motion.div {...bob(false)} className="flex flex-col items-center gap-3">
              <span className="text-7xl md:text-8xl">✋</span>
              <span className="px-4 py-1.5 rounded-xl bg-rose-500/90 text-white font-black text-lg md:text-2xl tracking-wide shadow-lg">
                ЗАБЛОКИРОВАНЫ
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
