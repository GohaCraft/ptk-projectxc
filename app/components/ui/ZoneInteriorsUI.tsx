"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Sliders, Eye, EyeOff, Layout, ListCollapse, Image as ImageIcon } from 'lucide-react';
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
      if (e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 pointer-events-none flex flex-col md:flex-row justify-between p-4 md:p-6 text-[#EFEFED]"
    >
      {/* LEFT DETAILED INFORMATION SIDEBAR */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full md:w-[410px] bg-[#090b11]/92 backdrop-blur-3xl border border-slate-850 p-5 md:p-6 rounded-3xl pointer-events-auto flex flex-col gap-5 justify-between shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] order-2 md:order-1 mt-auto md:mt-0 max-h-[48vh] md:max-h-full overflow-y-auto"
      >
        <div className="flex flex-col gap-4">
          {/* Back button and short tags */}
          <div className="flex items-center justify-between">
            <button
              onClick={onDeselect}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all font-mono text-xs font-bold text-sky-400 group cursor-pointer"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span>НАЗАД K МОДЕЛИ</span>
            </button>

            <span className="text-[10px] font-mono bg-sky-950/60 text-sky-450 border border-sky-900 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              {selectedZone.block} корпус / {selectedZone.floor} этаж
            </span>
          </div>

          {/* Title block */}
          <div className="border-b border-slate-800/40 pb-4">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white line-clamp-1">{selectedZone.name}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-mono">
              <span>{selectedZone.roomNumber}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span className="text-sky-450 font-bold">{selectedZone.area}</span>
            </div>
          </div>

          {/* Style Card (Окошко со стилем) */}
          <div className="bg-[#121622]/85 border border-sky-950/40 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-500 animate-pulse" />
              <span className="font-mono text-[10px] text-yellow-500 uppercase tracking-widest font-black">Дизайнерское решение</span>
            </div>
            
            <h3 className="font-bold text-sm text-sky-200">{selectedZone.styleTitle}</h3>
            <p className="text-xs text-slate-350 leading-relaxed font-sans">{selectedZone.styleDesc}</p>

            {/* Material token table */}
            <div className="grid grid-cols-1 gap-2 border-t border-slate-800/40 pt-3 mt-1 text-[11px] font-sans">
              {getStyleTokens(selectedZone.id).map((tok, i) => (
                <div key={i} className="flex justify-between items-start gap-3">
                  <span className="text-slate-500 min-w-[70px] uppercase font-mono text-[9px] tracking-wide mt-0.5">{tok.label}:</span>
                  <span className="text-slate-350 font-medium text-right font-sans">{tok.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery Multi-angles viewpoints selection */}
        <div className="flex flex-col gap-2 border-t border-slate-800/40 pt-4">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
            <ImageIcon size={11} className="text-sky-400" />
            <span>Интерактивные Ракурсы:</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {selectedZone.gallery.map((img, i) => {
              const active = i === activeAfterIndex;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setActiveAfterIndex(i);
                    setShowDirectComparison(false); // return to slider view automatically
                  }}
                  className={`group relative h-14 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                    active ? 'border-sky-400 ring-2 ring-sky-900/50' : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <img src={img} alt={`Ракурс ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/60 font-mono text-[9px] tracking-widest uppercase transition-colors ${
                    active ? 'text-sky-305 font-black bg-black/35' : 'text-slate-400 p-1 group-hover:text-slate-200'
                  }`}>
                    {i === 0 ? 'ФРОНТ' : i === 1 ? 'РАКУРС А' : 'РАКУРС Б'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* RIGHT INTERACTIVE BEFORE / AFTER IMAGE SLIDER CONTAINER */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full md:w-[620px] bg-[#090b11]/92 backdrop-blur-3xl border border-slate-850 p-4 md:p-5 rounded-3xl pointer-events-auto flex flex-col gap-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] order-1 md:order-2 height-fit relative"
      >
        {/* Slider toggle options */}
        <div className="flex items-center justify-between border-b border-slate-800/40 pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-black">Сравнение До / После</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDirectComparison(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[9px] font-black uppercase transition-all tracking-wide cursor-pointer ${
                showDirectComparison 
                  ? 'bg-amber-950/40 text-amber-300 border-amber-900/60' 
                  : 'bg-slate-900 text-slate-450 border-slate-800/80 hover:bg-slate-850'
              }`}
            >
              {showDirectComparison ? <Eye size={11} /> : <EyeOff size={11} />}
              <span>Сбоку Рядом</span>
            </button>
          </div>
        </div>

        {/* Dynamic content rendering depending on chosen layout style */}
        <div className="relative w-full h-[220px] md:h-[350px] bg-[#0c0f16] rounded-2xl overflow-hidden border border-slate-850 shadow-inner group">
          {showDirectComparison ? (
            /* SIDE-BY-SIDE SIMPLE COMPARISON TYPE */
            <div className="grid grid-cols-2 w-full h-full divide-x divide-slate-850">
              <div className="relative w-full h-full">
                <img src={selectedZone.beforeImg} alt="До" className="w-full h-full object-cover" />
                <div className="absolute bottom-2.5 left-2.5 bg-red-952/80 backdrop-blur border border-red-900/50 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-widest text-red-152 uppercase">
                  ДО РЕМОНТА
                </div>
              </div>
              <div className="relative w-full h-full">
                <img src={resolvedAfterImage} alt="После" className="w-full h-full object-cover animate-fade-in" />
                <div className="absolute bottom-2.5 right-2.5 bg-emerald-952/80 backdrop-blur border border-emerald-900/50 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-widest text-emerald-305 uppercase">
                  ДИЗАЙН-ПРОЕКТ
                </div>
              </div>
            </div>
          ) : (
            /* HIGHER INTERACTION SWIPE BAR SLIDER */
            <div 
              ref={sliderContainerRef}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
              className="relative w-full h-full select-none cursor-ew-resize"
            >
              {/* BEFORE IMAGE (Background) */}
              <img 
                src={selectedZone.beforeImg} 
                alt="До реконструкции" 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
              />
              <div className="absolute bottom-3 left-3 bg-red-950/80 backdrop-blur border border-red-900/50 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-widest text-red-400 uppercase z-10 shadow-lg select-none">
                АРХИВ ДЕПАРТАМЕНТА (ДО)
              </div>

              {/* AFTER IMAGE (Foreground Clipped) */}
              <img 
                src={resolvedAfterImage} 
                alt="Проект реновации" 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                style={{
                  clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
                }}
              />
              <div 
                className="absolute bottom-3 bg-emerald-950/80 backdrop-blur border border-emerald-900/50 px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-widest text-emerald-300 uppercase z-10 shadow-lg select-none"
                style={{
                  left: `${Math.min(90, Math.max(3, sliderPos - 30))}%`
                }}
              >
                РЕЗУЛЬТАТ (ПОСЛЕ)
              </div>

              {/* DYNAMIC SWIPE SPLITTER HANDLE */}
              <div 
                className="absolute top-0 bottom-0 w-1 flex items-center justify-center bg-sky-400/90 shadow-[0_0_15px_#38bdf8] hover:w-1.5 transition-all z-20"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute w-8 h-8 rounded-full bg-slate-900 border-2 border-sky-400 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)] hover:scale-105 active:scale-95 transition-all">
                  <Sliders size={12} className="rotate-90 text-sky-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pro Tip caption */}
        <div className="text-[10px] text-slate-450 flex items-center gap-1.5 font-mono italic">
          <Eye size={12} className="text-slate-500" />
          <span>Перемещайте ползунок влево/вправо на рендере, чтобы детально сравнить строительный корпус с проектом интерьера.</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
