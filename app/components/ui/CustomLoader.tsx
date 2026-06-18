"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgress } from '@react-three/drei';

interface CustomLoaderProps {
  hasStarted: boolean;
  firstFrameReady: boolean;
}

// Этапы загрузки — отображаются последовательно по мере роста процента.
// Реальный смысл (геометрия/материалы/освещение/сборка) сопоставлен
// с диапазонами общего прогресса для ощущения настоящего пайплайна.
const STAGES = [
  { label: 'Инициализация рендера',      threshold: 0  },
  { label: 'Загрузка геометрии корпусов', threshold: 15 },
  { label: 'Применение материалов',       threshold: 40 },
  { label: 'Расчёт планировки этажей',     threshold: 65 },
  { label: 'Настройка освещения',          threshold: 85 },
  { label: 'Сборка сцены',                 threshold: 97 },
];

export function CustomLoader({ hasStarted, firstFrameReady }: CustomLoaderProps) {
  const { active, progress, total, loaded } = useProgress();
  const [shouldShow, setShouldShow] = useState(true);
  const [displayedProgress, setDisplayedProgress] = useState(0);

  // ────────────────────────────────────────────────────────────────────
  // СИСТЕМА ДВОЙНОЙ ЗАЩИТЫ ОТ ЗАВИСАНИЯ ЗАГРУЗКИ
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted) return;

    const fallbackTimer = setTimeout(() => {
      if (firstFrameReady) {
        setDisplayedProgress(100);
        setShouldShow(false);
      }
    }, 6000);

    const absoluteTimer = setTimeout(() => {
      setDisplayedProgress(100);
      setShouldShow(false);
    }, 12000);

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(absoluteTimer);
    };
  }, [firstFrameReady, hasStarted]);

  // Плавная интерполяция прогресса
  useEffect(() => {
    let activeAnim = true;
    const updateProgress = () => {
      if (!activeAnim) return;

      const target = (progress >= 100 || !active) ? 100 : Math.max(progress, 0);

      setDisplayedProgress((prev) => {
        const step = (target - prev) * 0.15 + 1.5;
        const next = Math.min(prev + step, target);

        if (next >= 100 && firstFrameReady) {
          activeAnim = false;
        }
        return next;
      });

      if (activeAnim) {
        requestAnimationFrame(updateProgress);
      }
    };

    const animFrame = requestAnimationFrame(updateProgress);

    return () => {
      activeAnim = false;
      cancelAnimationFrame(animFrame);
    };
  }, [active, progress, firstFrameReady]);

  // Скрываем загрузчик
  useEffect(() => {
    if (displayedProgress >= 99.9 && firstFrameReady) {
      const timer = setTimeout(() => {
        setShouldShow(false);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [displayedProgress, firstFrameReady]);

  // Текущий и завершённые этапы по прогрессу
  const currentStageIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (displayedProgress >= STAGES[i].threshold) idx = i;
    }
    return idx;
  }, [displayedProgress]);

  if (!hasStarted || !shouldShow) return null;

  const percentageRounded = Math.round(displayedProgress);
  const isComplete = percentageRounded >= 100;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden select-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #10141c 0%, #060709 70%, #030405 100%)',
          }}
        >
          {/* ── Фоновая архитектурная сетка (чертёж) ── */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(120,170,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,0.5) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(ellipse at 50% 45%, black 0%, transparent 75%)',
            }}
          />

          {/* ── Медленно вращающийся контур (изометрический намёк на здание) ── */}
          <motion.div
            className="absolute"
            style={{ width: 520, height: 520 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full opacity-[0.10]">
              <polygon
                points="100,15 175,55 175,145 100,185 25,145 25,55"
                fill="none"
                stroke="#5b87c9"
                strokeWidth="0.5"
              />
              <polygon
                points="100,45 150,72 150,128 100,155 50,128 50,72"
                fill="none"
                stroke="#5b87c9"
                strokeWidth="0.4"
              />
              <line x1="100" y1="15" x2="100" y2="45" stroke="#5b87c9" strokeWidth="0.4" />
              <line x1="175" y1="55" x2="150" y2="72" stroke="#5b87c9" strokeWidth="0.4" />
              <line x1="175" y1="145" x2="150" y2="128" stroke="#5b87c9" strokeWidth="0.4" />
              <line x1="100" y1="185" x2="100" y2="155" stroke="#5b87c9" strokeWidth="0.4" />
              <line x1="25" y1="145" x2="50" y2="128" stroke="#5b87c9" strokeWidth="0.4" />
              <line x1="25" y1="55" x2="50" y2="72" stroke="#5b87c9" strokeWidth="0.4" />
            </svg>
          </motion.div>

          {/* ── Лёгкое мерцание-сканирование сверху вниз ── */}
          <motion.div
            className="absolute inset-x-0 h-32 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, transparent, rgba(91,135,201,0.06), transparent)',
            }}
            animate={{ y: ['-10%', '110%'] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
          />

          {/* ── Центральный блок ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center w-full max-w-md px-8"
          >
            {/* Бейдж / эмблема */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/60"
              style={{
                background: 'linear-gradient(135deg, rgba(91,135,201,0.12), rgba(20,24,32,0.4))',
                boxShadow: '0 0 0 1px rgba(91,135,201,0.08), 0 8px 32px -8px rgba(91,135,201,0.25)',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M3 21V8L12 3L21 8V21" stroke="#7da3dd" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M9 21V13H15V21" stroke="#7da3dd" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M3 11H21" stroke="#7da3dd" strokeWidth="1" opacity="0.5" />
              </svg>
            </motion.div>

            {/* Заголовок */}
            <span className="text-[11px] font-mono tracking-[0.45em] uppercase text-slate-300 font-semibold mb-1.5">
              Норильский политехнический
            </span>
            <span className="text-[9.5px] font-mono tracking-[0.3em] uppercase text-slate-500 font-medium mb-10">
              Цифровой двойник здания
            </span>

            {/* Прогресс */}
            <div className="w-full space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                  {isComplete ? 'Готово' : 'Загрузка'}
                </span>
                <span className="text-3xl font-mono font-light tabular-nums text-slate-100 tracking-tight">
                  {percentageRounded}
                  <span className="text-base text-slate-500 ml-0.5">%</span>
                </span>
              </div>

              {/* Прогресс-бар с подсветкой */}
              <div className="relative w-full h-[3px] bg-slate-800/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${displayedProgress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.15 }}
                  className="absolute h-full left-0 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #3a5f9e, #7da3dd, #aecbff)',
                    boxShadow: '0 0 12px 0 rgba(125,163,221,0.55)',
                  }}
                />
                {/* блик, бегущий по бару */}
                <motion.div
                  className="absolute top-0 h-full w-16 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                  }}
                  animate={{ x: ['-10%', `${Math.max(displayedProgress, 1) + 5}%`] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>

            {/* ── Список этапов загрузки ── */}
            <div className="w-full mt-8 space-y-2">
              {STAGES.map((stage, i) => {
                const isDone = i < currentStageIndex || isComplete;
                const isCurrent = i === currentStageIndex && !isComplete;
                return (
                  <div
                    key={stage.label}
                    className="flex items-center gap-3 text-[11px] font-mono"
                  >
                    {/* Индикатор */}
                    <div className="relative flex h-3.5 w-3.5 items-center justify-center flex-shrink-0">
                      {isDone ? (
                        <motion.svg
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                        >
                          <circle cx="12" cy="12" r="11" stroke="#5b87c9" strokeWidth="1.5" opacity="0.35" />
                          <path d="M7 12.5L10.5 16L17 9" stroke="#aecbff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      ) : isCurrent ? (
                        <motion.div
                          className="h-2.5 w-2.5 rounded-full border-[1.5px] border-slate-400/80 border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                        />
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                      )}
                    </div>

                    {/* Текст этапа */}
                    <span
                      className={
                        'tracking-wide transition-colors duration-300 ' +
                        (isDone
                          ? 'text-slate-400'
                          : isCurrent
                          ? 'text-slate-200'
                          : 'text-slate-600')
                      }
                    >
                      {stage.label}
                    </span>

                    {/* Статус справа */}
                    <span
                      className={
                        'ml-auto text-[9px] uppercase tracking-[0.2em] transition-colors duration-300 ' +
                        (isDone ? 'text-slate-500' : isCurrent ? 'text-slate-400' : 'text-slate-700')
                      }
                    >
                      {isDone ? 'ok' : isCurrent ? '...' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Счётчик ассетов */}
            {total > 0 && (
              <div className="text-[8.5px] font-mono text-slate-600 uppercase tracking-[0.3em] mt-8">
                {loaded} / {total} элементов сцены
              </div>
            )}
          </motion.div>

          {/* ── Тонкая нижняя кайма-индикатор ── */}
          <motion.div
            className="absolute bottom-0 left-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, #3a5f9e, #7da3dd)' }}
            animate={{ width: `${displayedProgress}%` }}
            transition={{ ease: 'easeOut', duration: 0.15 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}