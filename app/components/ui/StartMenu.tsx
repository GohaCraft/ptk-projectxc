"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
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

      {/* ── Фон: северное сияние (полярная тема Норильска) ───────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* мягкие световые пятна */}
        <motion.div
          className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[120vw] h-[70vh] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(closest-side, rgba(56,189,248,0.20), transparent)' }}
          animate={{ x: ['-52%', '-48%', '-52%'], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[8%] left-[10%] w-[55vw] h-[55vh] rounded-full blur-[130px]"
          style={{ background: 'radial-gradient(closest-side, rgba(45,212,191,0.16), transparent)' }}
          animate={{ y: ['-4%', '4%', '-4%'], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[6%] right-[8%] w-[50vw] h-[50vh] rounded-full blur-[130px]"
          style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.16), transparent)' }}
          animate={{ y: ['4%', '-3%', '4%'], opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
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
          className="text-4xl md:text-6xl lg:text-7xl font-sans tracking-tight font-extralight leading-[1.05] mb-6"
        >
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            ЗГУ политехнический
          </span>
          <br className="hidden sm:block" />
          <span className="font-light bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">
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

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          onClick={handleClick}
          className="group relative flex items-center justify-center gap-3 pl-7 pr-6 py-3.5 rounded-xl overflow-hidden cursor-pointer
                     border border-sky-400/30 bg-gradient-to-r from-sky-500/15 to-cyan-500/10
                     text-slate-100 hover:text-white hover:border-sky-300/60 transition-all
                     shadow-[0_8px_30px_-12px_rgba(56,189,248,0.5)]"
        >
          {/* блик при наведении */}
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700
                           bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <span className="relative text-[12px] font-mono tracking-[0.22em] uppercase font-semibold">
            Просмотр 3D модели
          </span>
          <ArrowRight className="relative w-4 h-4 text-sky-300 group-hover:translate-x-1 transition-transform" />
        </motion.button>

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
