"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X } from 'lucide-react';

type UpdateState = 'idle' | 'available' | 'downloading' | 'downloaded';

// Тип моста из preload.js (есть только в .exe; в браузере — undefined)
declare global {
  interface Window {
    electronUpdater?: {
      onStatus: (cb: (d: { state: string; version?: string; percent?: number }) => void) => () => void;
      restart: () => void;
    };
  }
}

/**
 * Аккуратная плашка сверху о ходе авто-обновления — вместо блокирующего
 * нативного окна Windows. Появляется только в собранном .exe (где есть мост
 * electronUpdater). В вебе ничего не рендерит.
 */
export default function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState<string>('');
  const [percent, setPercent] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.electronUpdater : undefined;
    if (!api) return;
    const off = api.onStatus((d) => {
      if (d.state === 'available') { setState('available'); if (d.version) setVersion(d.version); }
      else if (d.state === 'downloading') { setState('downloading'); if (typeof d.percent === 'number') setPercent(d.percent); }
      else if (d.state === 'downloaded') { setState('downloaded'); if (d.version) setVersion(d.version); setDismissed(false); }
    });
    return off;
  }, []);

  const show = state !== 'idle' && !dismissed;
  const restart = () => window.electronUpdater?.restart();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[65] pointer-events-auto"
        >
          <div className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl border border-sky-500/40 bg-[#0b1220]/95 shadow-2xl text-slate-100">
            {state === 'downloaded' ? (
              <>
                <RefreshCw size={16} className="text-emerald-400 shrink-0" />
                <span className="text-[13px] font-semibold">
                  Обновление {version && `${version} `}готово
                </span>
                <button
                  onClick={restart}
                  className="ml-1 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[12px] font-bold transition-colors"
                >
                  Перезапустить
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Позже"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <Download size={16} className="text-sky-400 shrink-0 animate-pulse" />
                <span className="text-[13px] font-semibold">
                  {state === 'downloading' ? `Загрузка обновления… ${percent}%` : 'Найдено обновление, загружаю…'}
                </span>
                {state === 'downloading' && (
                  <span className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <span className="block h-full bg-sky-400 transition-[width] duration-300" style={{ width: `${percent}%` }} />
                  </span>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
