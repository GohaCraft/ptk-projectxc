"use client";

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { subscribeErrors } from '../data/errorState';
import { getErrorInfo } from '../data/errorCodes';

/**
 * Плашка ошибок (низ-лево). Появляется только при наличии ошибок.
 * Сверху — номер(а) ошибки, снизу — где находится. Несколько — через запятую.
 */
export default function ErrorOverlay() {
  const [codes, setCodes] = useState<number[]>([]);

  useEffect(() => subscribeErrors(setCodes), []);

  const numbers = codes.join(', ');
  const places = codes.map((c) => getErrorInfo(c).where).join(', ');

  return (
    <AnimatePresence>
      {codes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="fixed bottom-4 left-4 z-[70] pointer-events-auto max-w-xs"
        >
          <div className="flex items-stretch gap-3 rounded-2xl border border-rose-500/40 bg-[#1a0c10]/90 backdrop-blur-xl px-4 py-3 shadow-[0_18px_40px_-12px_rgba(225,29,72,0.5)]">
            <div className="flex items-center">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/40">
                <AlertTriangle size={18} className="text-rose-300" />
              </span>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              {/* СВЕРХУ — номер(а) ошибки */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400/80">Ошибка №</span>
                <span className="font-mono text-base font-black text-rose-200 leading-none tabular-nums">{numbers}</span>
              </div>
              {/* СНИЗУ — где находится */}
              <span className="text-[11px] text-slate-300 leading-snug mt-0.5 truncate">{places}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
