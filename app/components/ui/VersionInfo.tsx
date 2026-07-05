"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Sparkles, Check } from 'lucide-react';
import { APP_VERSION, CHANGELOG, ChangelogEntry } from '../data/changelog';

const SEEN_KEY = 'npc_last_seen_version';

// Сравнение версий "a.b.c"
function parseV(v: string): number[] {
  return v.split('.').map((n) => parseInt(n, 10) || 0);
}
function cmpV(a: string, b: string): number {
  const pa = parseV(a), pb = parseV(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

type Tier = 'current' | 'release' | 'beta' | 'alpha';
function tierOf(version: string): Tier {
  if (version === APP_VERSION) return 'current';       // самая свежая
  if (cmpV(version, '1.22') >= 0) return 'release';    // 1.22, 1.23 — релиз
  if (cmpV(version, '1.18') >= 0) return 'beta';       // 1.18 … 1.21 — бета
  return 'alpha';                                      // 0.13.0 и всё ниже — альфа
}

// Переливающиеся градиенты для плашек
const TIER_BADGE: Record<Tier, { label: string; grad: string }> = {
  current: { label: 'Текущая',   grad: 'linear-gradient(90deg,#10b981,#34d399,#10b981)' },
  release: { label: 'Релиз',     grad: 'linear-gradient(90deg,#0284c7,#38bdf8,#0284c7)' },
  beta:    { label: 'Бета',      grad: 'linear-gradient(90deg,#d97706,#fbbf24,#d97706)' },
  alpha:   { label: 'Альфа',     grad: 'linear-gradient(90deg,#7c3aed,#c084fc,#7c3aed)' },
};

function TierBadge({ tier }: { tier: Tier }) {
  const b = TIER_BADGE[tier];
  // Переливание (анимация) — только у «Текущей»: при большом списке версий
  // десятки анимированных плашек зря грузили бы кадр. Остальные — статичный градиент.
  return (
    <span
      className={`${tier === 'current' ? 'ch-badge' : ''} font-mono text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full text-white border border-white/20 shadow-[0_0_10px_-2px_rgba(255,255,255,0.35)]`}
      style={{ backgroundImage: b.grad }}
    >
      {b.label}
    </span>
  );
}

function EntryCard({ entry, highlight = false }: { entry: ChangelogEntry; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3.5 ${highlight ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/70 bg-[#121319]'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2">
          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${highlight ? 'bg-sky-500/80 text-white' : 'bg-slate-800 text-slate-300'}`}>
            v{entry.version}
          </span>
          <span className="text-slate-200 text-[13px] font-semibold">{entry.title}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <TierBadge tier={tierOf(entry.version)} />
          <span className="text-slate-500 text-[10px] font-mono">{entry.date}</span>
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {entry.changes.map((c, i) => (
          <li key={i} className="flex gap-2 text-slate-400 text-[11.5px] leading-snug">
            <Check size={13} className="text-sky-400 mt-0.5 shrink-0" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VersionInfo() {
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // Список версий рисуется не весь сразу (на будущее, когда версий станет много).
  const [expandedAll, setExpandedAll] = useState(false);
  const VISIBLE_LIMIT = 6;

  // При первом запуске новой версии — авто-окно «Что нового»
  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      if (seen !== APP_VERSION) {
        setShowWhatsNew(true);
        localStorage.setItem(SEEN_KEY, APP_VERSION);
      }
    } catch {
      // приватный режим / недоступный localStorage — просто не показываем
    }
  }, []);

  const latest = CHANGELOG[0];

  return (
    <>
      {/* Кнопка (i) — история версий */}
      <button
        id="btn_version_info"
        onClick={() => { setExpandedAll(false); setShowAll(true); }}
        title={`Версия ${APP_VERSION} — история изменений`}
        className="absolute right-4 md:right-6 top-4 md:top-6 z-30 pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center bg-[#0c0d12]/92 backdrop-blur-3xl border border-slate-800/80 shadow-2xl text-slate-300 hover:text-white hover:border-sky-500/70 hover:bg-sky-950/40 transition-all duration-300 cursor-pointer animate-fade-in"
      >
        <Info size={18} strokeWidth={2.2} />
      </button>

      {/* Окно «Что нового» (авто при первом запуске версии) */}
      <AnimatePresence>
        {showWhatsNew && latest && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWhatsNew(false)}
          >
            <motion.div
              className="w-full max-w-md bg-[#0c0d12] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-5 pb-3 bg-gradient-to-b from-sky-950/40 to-transparent">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={18} className="text-sky-400" />
                  <span className="text-slate-100 text-base font-bold">Что нового</span>
                  <span className="ml-auto font-mono text-[11px] text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded">v{latest.version}</span>
                </div>
                <span className="text-slate-500 text-[11px]">{latest.title} · {latest.date}</span>
              </div>
              <div className="px-5 pb-4">
                <ul className="flex flex-col gap-2 mt-1">
                  {latest.changes.map((c, i) => (
                    <li key={i} className="flex gap-2 text-slate-300 text-[12.5px] leading-snug">
                      <Check size={15} className="text-sky-400 mt-0.5 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={() => { setShowWhatsNew(false); setExpandedAll(false); setShowAll(true); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Все версии
                </button>
                <button
                  onClick={() => setShowWhatsNew(false)}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Понятно
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Полная история версий (кнопка i) */}
      <AnimatePresence>
        {showAll && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAll(false)}
          >
            <motion.div
              className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0c0d12] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info size={17} className="text-sky-400" />
                  <span className="text-slate-100 text-sm font-bold">История версий</span>
                  <span className="font-mono text-[10px] text-slate-500">текущая v{APP_VERSION}</span>
                </div>
                <button
                  onClick={() => setShowAll(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto flex flex-col gap-3 scrollbar-none">
                {(expandedAll ? CHANGELOG : CHANGELOG.slice(0, VISIBLE_LIMIT)).map((entry, i) => (
                  <EntryCard key={entry.version} entry={entry} highlight={i === 0} />
                ))}
                {!expandedAll && CHANGELOG.length > VISIBLE_LIMIT && (
                  <button
                    onClick={() => setExpandedAll(true)}
                    className="mt-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Показать все версии ({CHANGELOG.length})
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
