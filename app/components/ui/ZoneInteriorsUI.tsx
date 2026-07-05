"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Sliders, Eye, EyeOff, Image as ImageIcon, MoveHorizontal } from 'lucide-react';
import { InteractiveZone } from '../data/interactiveZones';

interface ZoneInteriorsUIProps {
  selectedZone: InteractiveZone | null;
  onDeselect: () => void;
}

export default function ZoneInteriorsUI({ selectedZone, onDeselect }: ZoneInteriorsUIProps) {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 to 100
  const [activeAfterIndex, setActiveAfterIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showDirectComparison, setShowDirectComparison] = useState<boolean>(false);

  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Reset indices on zone switch
  useEffect(() => {
    setSliderPos(50);
    setActiveAfterIndex(0);
  }, [selectedZone]);

  // Attach window listeners for smooth dragging outside viewport bounds
  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!sliderContainerRef.current) return;
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percentage);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      if (e.touches[0]) handleMove(e.touches[0].clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const handlePointerUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging]);

  if (!selectedZone) return null;

  // Use the selected viewpoint thumbnail as the main after image
  const resolvedAfterImage = selectedZone.gallery[activeAfterIndex] || selectedZone.afterImg;

  // Render dummy style details based on selected zone
  const getStyleTokens = (zoneId: string) => {
    switch (zoneId) {
      case 'vestibule_main':
        return [
          { label: 'Освещение', val: 'Линейные LED 4000K + световые соты' },
          { label: 'Полы', val: 'Шлифованный керамогранит 1200x600мм' },
          { label: 'Стены', val: 'Декоративная рейка, матовый графит' },
          { label: 'Мебель', val: 'Ресепшн-стойка из монолитного кварца' }
        ];
      case 'it_lab':
        return [
          { label: 'Освещение', val: 'Регулируемые RGB профили + фокусный свет' },
          { label: 'Полы', val: 'Антистатический полиуретановый наливной пол' },
          { label: 'Стены', val: 'Акустический поролон, перфорированные панели' },
          { label: 'Мебель', val: 'Эргономичные столы-трансформеры с кабель-каналами' }
        ];
      case 'coworking_library':
        return [
          { label: 'Освещение', val: 'Теплые лампы Эдисона, направленные купола' },
          { label: 'Полы', val: 'Инженерная доска (натуральный дуб)' },
          { label: 'Стены', val: 'Акустический шпон, живые стабилизированные растения' },
          { label: 'Мебель', val: 'Индивидуальные звукоизолированные капсулы' }
        ];
      case 'workout_gym':
        return [
          { label: 'Освещение', val: 'Линейный неоновый контраст (аквамарин)' },
          { label: 'Полы', val: 'Каучуковая износостойкая плитка 20мм' },
          { label: 'Стены', val: 'Обнаженный монолитный бетон, зеркала в рамах' },
          { label: 'Мебель', val: 'Вварные усиленные рамы спортивного инвентаря' }
        ];
      case 'conference_hall':
        return [
          { label: 'Освещение', val: 'Диммируемые плоские светодиодные даунлайты' },
          { label: 'Полы', val: 'ковролин повышенной износостойкости 33 класса' },
          { label: 'Стены', val: 'Радиусные шпонированные щиты басовых ловушек' },
          { label: 'Мебель', val: 'Парты-амфитеатры с интегрированными розетками' }
        ];
      case 'rector_room':
        return [
          { label: 'Освещение', val: 'Скрытый закарнизный свет, люстра из латуни' },
          { label: 'Полы', val: 'Художественный паркет, американская текстура' },
          { label: 'Стены', val: 'Интарсия, стеновые панели из американского ореха' },
          { label: 'Мебель', val: 'Премиальный овальный стол на стальном подкосе' }
        ];
      default:
        return [
          { label: 'Концепт', val: 'Авторский эко-дизайн интерьеров ЗГУ' },
          { label: 'Энергоэффективность', val: 'Класс A++ светодиодных схем' }
        ];
    }
  };

  const viewLabels = ['ФРОНТ', 'РАКУРС А', 'РАКУРС Б'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 pointer-events-none flex flex-col md:flex-row justify-between p-4 md:p-6 text-slate-100"
    >
      {/* ── ЛЕВАЯ ИНФО-ПАНЕЛЬ ─────────────────────────────────────────── */}
      <motion.div
        initial={{ x: -90, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -90, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full md:w-[420px] bg-[#0a0c12]/85 backdrop-blur-2xl border border-white/10 ring-1 ring-black/40 p-5 md:p-6 rounded-3xl pointer-events-auto flex flex-col gap-5 justify-between shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] order-2 md:order-1 mt-auto md:mt-0 max-h-[48vh] md:max-h-full overflow-y-auto scrollbar-none"
      >
        <div className="flex flex-col gap-4">
          {/* Back button and tag */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onDeselect}
              className="group flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-sky-500/15 hover:border-sky-400/40 transition-all font-mono text-[11px] font-bold text-sky-300 cursor-pointer"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span className="tracking-wide">К МОДЕЛИ</span>
            </button>

            <span className="text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-400/25 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
              {selectedZone.block} корпус · {selectedZone.floor} этаж
            </span>
          </div>

          {/* Title */}
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent line-clamp-2">
              {selectedZone.name}
            </h2>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 font-mono">
              <span>{selectedZone.roomNumber}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="text-sky-300 font-bold">{selectedZone.area}</span>
            </div>
          </div>

          {/* Designer solution card */}
          <div className="relative rounded-2xl p-px bg-gradient-to-br from-sky-400/30 via-white/5 to-transparent">
            <div className="bg-[#0d1019]/90 rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-400/15 border border-amber-400/30">
                  <Sparkles size={12} className="text-amber-300" />
                </span>
                <span className="font-mono text-[10px] text-amber-300 uppercase tracking-[0.15em] font-bold">Дизайнерское решение</span>
              </div>

              <h3 className="font-bold text-sm text-sky-200">{selectedZone.styleTitle}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{selectedZone.styleDesc}</p>

              {/* Material tokens */}
              <div className="grid grid-cols-1 gap-2.5 border-t border-white/10 pt-3 mt-1 text-[11px]">
                {getStyleTokens(selectedZone.id).map((tok, i) => (
                  <div key={i} className="flex justify-between items-start gap-3">
                    <span className="text-slate-500 min-w-[72px] uppercase font-mono text-[9px] tracking-wide mt-0.5">{tok.label}</span>
                    <span className="text-slate-300 font-medium text-right">{tok.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery viewpoints */}
        <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            <ImageIcon size={11} className="text-sky-400" />
            <span>Интерактивные ракурсы</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {selectedZone.gallery.map((img, i) => {
              const active = i === activeAfterIndex;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setActiveAfterIndex(i);
                    setShowDirectComparison(false);
                  }}
                  className={`group relative h-16 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                    active ? 'border-sky-400 ring-2 ring-sky-500/40' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={img} alt={`Ракурс ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className={`absolute inset-0 flex items-end justify-center pb-1 bg-gradient-to-t from-black/75 to-transparent font-mono text-[8px] tracking-widest uppercase transition-colors ${
                    active ? 'text-sky-200 font-black' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {viewLabels[i] || `РАКУРС ${i + 1}`}
                  </div>
                  {active && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_2px_rgba(56,189,248,0.7)]" />}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── ПРАВАЯ ПАНЕЛЬ: До / После ─────────────────────────────────── */}
      <motion.div
        initial={{ x: 90, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 90, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full md:w-[640px] bg-[#0a0c12]/85 backdrop-blur-2xl border border-white/10 ring-1 ring-black/40 p-4 md:p-5 rounded-3xl pointer-events-auto flex flex-col gap-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] order-1 md:order-2 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-400/15 border border-emerald-400/30">
              <Sliders size={12} className="text-emerald-300" />
            </span>
            <span className="font-mono text-[10px] text-emerald-300 uppercase tracking-[0.15em] font-bold">Сравнение До / После</span>
          </div>

          {/* segmented toggle */}
          <div className="flex p-0.5 rounded-xl bg-white/5 border border-white/10 gap-0.5">
            <button
              onClick={() => setShowDirectComparison(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                !showDirectComparison ? 'bg-sky-500/80 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MoveHorizontal size={11} />
              <span>Ползунок</span>
            </button>
            <button
              onClick={() => setShowDirectComparison(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                showDirectComparison ? 'bg-sky-500/80 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye size={11} />
              <span>Рядом</span>
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="relative w-full h-[220px] md:h-[360px] bg-[#06080d] rounded-2xl overflow-hidden border border-white/10 shadow-inner group">
          {showDirectComparison ? (
            /* SIDE-BY-SIDE */
            <div className="grid grid-cols-2 w-full h-full divide-x divide-white/10">
              <div className="relative w-full h-full">
                <img src={selectedZone.beforeImg} alt="До" className="w-full h-full object-cover" />
                <div className="absolute bottom-2.5 left-2.5 bg-rose-500/20 backdrop-blur border border-rose-400/40 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-widest text-rose-200 uppercase">
                  До ремонта
                </div>
              </div>
              <div className="relative w-full h-full">
                <img src={resolvedAfterImage} alt="После" className="w-full h-full object-cover animate-fade-in" />
                <div className="absolute bottom-2.5 right-2.5 bg-emerald-500/20 backdrop-blur border border-emerald-400/40 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-widest text-emerald-200 uppercase">
                  Дизайн-проект
                </div>
              </div>
            </div>
          ) : (
            /* SWIPE SLIDER */
            <div
              ref={sliderContainerRef}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
              className="relative w-full h-full select-none cursor-ew-resize"
            >
              <img
                src={selectedZone.beforeImg}
                alt="До реконструкции"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              <div className="absolute bottom-3 left-3 bg-rose-500/20 backdrop-blur border border-rose-400/40 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-widest text-rose-200 uppercase z-10 shadow-lg select-none">
                Архив (До)
              </div>

              <img
                src={resolvedAfterImage}
                alt="Проект реновации"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
              />
              <div
                className="absolute bottom-3 bg-emerald-500/20 backdrop-blur border border-emerald-400/40 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-widest text-emerald-200 uppercase z-10 shadow-lg select-none"
                style={{ left: `${Math.min(82, Math.max(3, sliderPos - 26))}%` }}
              >
                Проект (После)
              </div>

              {/* splitter handle */}
              <div
                className="absolute top-0 bottom-0 w-px flex items-center justify-center bg-white/90 shadow-[0_0_18px_rgba(56,189,248,0.6)] z-20"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute w-9 h-9 rounded-full bg-[#0a0c12] border-2 border-sky-400 flex items-center justify-center text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.5)] hover:scale-110 active:scale-95 transition-transform">
                  <MoveHorizontal size={14} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
          <Eye size={12} className="text-slate-500 shrink-0" />
          <span>Перемещайте ползунок на изображении, чтобы сравнить нынешнее состояние с дизайн-проектом.</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
