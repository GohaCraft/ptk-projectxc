"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, CheckCircle2 } from 'lucide-react';

type UpdateState = 'idle' | 'available' | 'downloading' | 'downloaded';

// Тип моста из preload.js (есть только в .exe; в браузере — undefined)
declare global {
  interface Window {
    electronUpdater?: {
      onStatus: (cb: (d: { state: string; version?: string; percent?: number; bytesPerSecond?: number }) => void) => () => void;
      restart: () => void;
    };
  }
}

function fmtSpeed(bps?: number): string {
  if (!bps || bps <= 0) return '';
  const mb = bps / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} МБ/с`;
  return `${(bps / 1024).toFixed(0)} КБ/с`;
}

/**
 * Плашка хода авто-обновления (вместо нативного окна Windows). В .exe скачивание
 * показывается с процентом и скоростью; после загрузки приложение устанавливает
 * обновление САМО (тихо, без окна установщика) и перезапускается. В вебе ничего
 * не рендерит.
 */
export default function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState('');
  const [percent, setPercent] = useState(0);
  const [speed, setSpeed] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.electronUpdater : undefined;
    if (!api) return;
    const off = api.onStatus((d) => {
      if (d.state === 'available') {
        setState('available'); if (d.version) setVersion(d.version); setDismissed(false);
      } else if (d.state === 'downloading') {
        setState('downloading');
        if (typeof d.percent === 'number') setPercent(d.percent);
        setSpeed(fmtSpeed(d.bytesPerSecond));
        setDismissed(false);
      } else if (d.state === 'downloaded') {
        setState('downloaded'); if (d.version) setVersion(d.version); setDismissed(false);
      }
    });
    return off;
  }, []);

  const show = state !== 'idle' && !dismissed;
  const installing = state === 'downloaded';
  const restartNow = () => window.electronUpdater?.restart();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[65] pointer-events-auto w-[min(92vw,420px)]"
        >
          <div className="overflow-hidden rounded-2xl border border-sky-400/30 bg-[#0b1220]/95 backdrop-blur-xl shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-3 px-4 py-3">
              {installing
                ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                : <Download size={18} className="text-sky-400 shrink-0 animate-pulse" />}

              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-100 truncate">
                  {installing
                    ? `Обновление ${version ? version + ' ' : ''}устанавливается…`
                    : state === 'downloading'
                      ? 'Загрузка обновления'
                      : 'Найдено обновление, загружаю…'}
                </div>
                {state === 'downloading' && (
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                    {percent}%{speed ? ` · ${speed}` : ''}
                  </div>
                )}
                {installing && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Приложение перезапустится автоматически
                  </div>
                )}
              </div>

              {installing ? (
                <button
                  onClick={restartNow}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[12px] font-bold transition-colors"
                >
                  Сейчас
                </button>
              ) : (
                <button
                  onClick={() => setDismissed(true)}
                  title="Скрыть"
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Прогресс-полоса */}
            <div className="h-1.5 bg-white/[0.06]">
              <motion.div
                className="h-full rounded-r-full"
                style={{ background: installing ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#2f5db0,#7da3dd)' }}
                animate={{ width: installing ? '100%' : `${percent}%` }}
                transition={{ ease: 'easeOut', duration: 0.25 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
