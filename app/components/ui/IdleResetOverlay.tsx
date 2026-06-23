"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
//  АВТО-ВОЗВРАТ ПО БЕЗДЕЙСТВИЮ (для киоска)
//  Через IDLE_MS без касаний/активности появляется плашка с обратным отсчётом
//  от COUNTDOWN до 1. Любое касание экрана (или клавиша) отменяет отсчёт и
//  перезапускает таймер. Если за время отсчёта никто не коснулся — onTimeout()
//  (возврат на стартовый экран).
// ─────────────────────────────────────────────────────────────────────────────

const IDLE_MS = 120_000; // 2 минуты бездействия
const COUNTDOWN = 10;    // секунд обратного отсчёта

export default function IdleResetOverlay({
  active,
  onTimeout,
}: {
  active: boolean;
  onTimeout: () => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const counting = useRef(false);

  // Держим актуальный колбэк в ref, чтобы эффект зависел только от `active`
  // (родитель перерисовывается каждую секунду из-за FPS — иначе таймер сбрасывался бы).
  const cb = useRef(onTimeout);
  useEffect(() => { cb.current = onTimeout; }, [onTimeout]);

  useEffect(() => {
    if (!active) return;

    const clearTick = () => {
      if (tick.current) { clearInterval(tick.current); tick.current = null; }
      counting.current = false;
    };

    const startCountdown = () => {
      counting.current = true;
      let c = COUNTDOWN;
      setCount(c);
      tick.current = setInterval(() => {
        c -= 1;
        if (c <= 0) {
          clearTick();
          setCount(null);
          cb.current();
        } else {
          setCount(c);
        }
      }, 1000);
    };

    const armIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(startCountdown, IDLE_MS);
    };

    const onActivity = () => {
      // Любая активность отменяет отсчёт и заново заводит таймер простоя.
      if (counting.current) { clearTick(); setCount(null); }
      armIdle();
    };

    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    armIdle();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      clearTick();
      setCount(null);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {count !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          // pointer-events-none — чтобы касание прошло к сцене и сработало как «активность»
          className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none select-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(6,9,14,0.82), rgba(3,4,6,0.92))' }}
        >
          <div className="flex flex-col items-center px-8 text-center">
            <span className="text-[11px] font-mono uppercase tracking-[0.4em] text-slate-400 mb-6">
              Нет активности
            </span>

            <motion.div
              key={count}
              initial={{ scale: 0.7, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex h-40 w-40 items-center justify-center rounded-full border border-sky-500/30 mb-7"
              style={{ boxShadow: '0 0 60px -10px rgba(56,140,230,0.5)' }}
            >
              <span className="text-7xl font-light tabular-nums text-slate-50">{count}</span>
            </motion.div>

            <span className="text-base font-medium text-slate-200 mb-1.5">
              Возврат в главное меню
            </span>
            <span className="text-[13px] text-slate-400">
              Коснитесь экрана, чтобы остаться
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
