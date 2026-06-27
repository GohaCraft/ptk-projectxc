"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, Navigation2 } from 'lucide-react';
import { APP_VERSION } from '../data/changelog';
import VersionInfo from './VersionInfo';

export default function StartMenu({ onStart, locked = false }: { onStart: () => void; locked?: boolean }) {
  const [showLocked, setShowLocked] = useState(false);

  const handleClick = () => {
    if (locked) {
      setShowLocked(true);
      return;
    }
    onStart();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative overflow-hidden bg-[#05060a] text-[#f1f5f9]">
      {/* Версии: кнопка (i) + окно «Что нового» — прямо на вступительном экране */}
      <VersionInfo />

      {/* ── Фон: северное сияние (статичное, без покадрового блюра) ──────────
          Раньше здесь были три огромных blur-[120px] пятна с бесконечной
          анимацией — полноэкранное гауссово размытие пересчитывалось каждый
          кадр и роняло FPS меню сильнее, чем сама 3D-сцена. Теперь это
          статичные радиальные градиенты: выглядят так же, но стоят 0 на кадр. */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Медленно вращающееся «сияние» — compositor-only (transform), дёшево для GPU */}
        <div
          className="menu-orbit absolute left-1/2 top-1/2 w-[140vmax] h-[140vmax] opacity-60"
          style={{
            transform: 'translate(-50%, -50%)',
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.10) 55deg, transparent 130deg, rgba(45,212,191,0.08) 210deg, transparent 290deg, rgba(99,102,241,0.09) 340deg, transparent 360deg)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, rgba(56,189,248,0.18), transparent 70%),' +
              'radial-gradient(45% 45% at 12% 12%, rgba(45,212,191,0.14), transparent 70%),' +
              'radial-gradient(42% 42% at 88% 10%, rgba(99,102,241,0.14), transparent 70%)',
          }}
        />

        {/* тонкая сетка-перспектива у пола */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.6) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
            maskImage: 'linear-gradient(to top, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          }}
        />

        {/* виньетка */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(0,0,0,0.65)_100%)]" />
      </div>

      {/* верхний бренд-маркер */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-6 left-0 right-0 z-10 flex items-center justify-center gap-2 pointer-events-none"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.6)]" />
        <span className="text-slate-400 text-[10px] font-mono uppercase tracking-[0.4em] font-medium">
          ЗГУ • Цифровой двойник
        </span>
      </motion.div>

      {/* ── Центральный контент ─────────────────────────────────────────── */}
      <div className="z-10 flex flex-col items-center text-center max-w-2xl px-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-7"
        >
          <span className="px-3 py-1 rounded-full border border-slate-700/70 bg-white/[0.02] backdrop-blur-sm text-slate-400 text-[10px] font-mono uppercase tracking-[0.3em] font-medium">
            3D Digital Twin • Prototype
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl md:text-5xl lg:text-6xl font-sans tracking-tight font-extralight leading-[1.05] mb-6"
        >
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            ЗГУ политехнический
          </span>
          <br className="hidden sm:block" />
          <span className="menu-text-shimmer font-light bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">
            колледж
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-slate-400 text-sm md:text-base font-light mb-9 max-w-lg leading-relaxed"
        >
          Интерактивный цифровой двойник образовательного пространства.
          Высокоточная визуализация архитектуры здания и проработка внутренних дизайн-концептов.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 0.25, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-28 h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent mb-9"
        />

        {/* Кнопки одной ширины, аккуратной колонкой; обе анимированы при наведении */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="flex flex-col items-stretch gap-3.5 w-full max-w-[330px] mb-4"
        >
          {/* Основная — Просмотр 3D (залитая) */}
          <motion.button
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleClick}
            className="group relative flex items-center justify-center gap-3 px-7 py-4 rounded-2xl overflow-hidden cursor-pointer
                       text-white transition-colors ring-1 ring-inset ring-white/20
                       bg-gradient-to-br from-sky-500 to-cyan-500
                       shadow-[0_14px_42px_-12px_rgba(56,189,248,0.7)]"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out
                             bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <span className="relative text-[12.5px] font-mono tracking-[0.22em] uppercase font-semibold">
              Просмотр 3D модели
            </span>
            <ArrowRight className="relative w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </motion.button>

          {/* Вторичная — Навигатор (стекло, тоже анимирована) */}
          <motion.button
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.assign('/navigator')}
            className="group relative flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl overflow-hidden cursor-pointer
                       text-slate-200 hover:text-white transition-colors
                       bg-white/[0.05] border border-teal-300/25 hover:border-teal-300/70
                       shadow-[0_10px_30px_-14px_rgba(45,212,191,0.55)]"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-out
                             bg-gradient-to-r from-transparent via-teal-200/25 to-transparent" />
            <Navigation2 className="relative w-4 h-4 text-teal-300 group-hover:-rotate-12 transition-transform" />
            <span className="relative text-[12.5px] font-mono tracking-[0.22em] uppercase font-semibold">
              Навигатор по кабинетам
            </span>
          </motion.button>
        </motion.div>

        {/* Сообщение о блокировке модели администратором */}
        <AnimatePresence>
          {showLocked && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-5 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 backdrop-blur-sm text-rose-200"
            >
              <Lock size={15} className="text-rose-300 shrink-0" />
              <span className="text-[12px] font-medium tracking-wide">Модель заблокирована администратором</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* нижняя строка статуса */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex items-center justify-center gap-3 pointer-events-none">
        <span className="text-[9px] font-mono text-slate-600 tracking-[0.3em] uppercase">
          ЗГУ • Норильск 2026
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span className="text-[9px] font-mono text-slate-600 tracking-[0.2em]">v{APP_VERSION}</span>
      </div>
    </div>
  );
}
