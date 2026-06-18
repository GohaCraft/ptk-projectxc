"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function StartMenu({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full relative overflow-hidden bg-[#07080a] text-[#f1f5f9]">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        {/* Subtle, soft ambient background gradient (extremely dim/matte) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(30,41,59,0.15)_0%,_transparent_75%)]" />
      </div>

      <div className="z-10 flex flex-col items-center text-center max-w-2xl px-6 w-full">
        {/* Compact, understated mono tag */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.35em] font-medium">
            3D DIGITAL TWIN • PROTOTYPE
          </span>
        </motion.div>

        {/* Masterfully spaced, lightweight, geometric typography */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl md:text-5xl lg:text-6xl font-sans tracking-tight font-extralight text-slate-100 leading-tight mb-5"
        >
          ЗГУ политехнический <br className="hidden sm:block" />
          <span className="font-light text-slate-200">колледж</span>
        </motion.h1>

        {/* Informative yet simple conceptual subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-slate-500 text-xs md:text-sm font-light mb-10 max-w-md leading-relaxed"
        >
          Цифровой двойник образовательного пространства. Высокоточная визуализация архитектурной формы здания и проработка внутренних дизайн-концептов.
        </motion.p>
        
        {/* Subtle separator line */}
        <motion.div
           initial={{ opacity: 0, scaleX: 0 }} 
           animate={{ opacity: 0.2, scaleX: 1 }} 
           transition={{ duration: 0.8, delay: 0.3 }}
           className="w-24 h-px bg-slate-700 mb-10"
        />

        {/* Ultra-clean, premium, minimalist button with fine borders and zero glowing effects */}
        <motion.button 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          whileHover={{ scale: 1.01, backgroundColor: "rgba(241, 245, 249, 0.05)" }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          onClick={onStart}
          className="group relative flex items-center justify-between gap-6 pl-6 pr-5 py-3 border border-slate-800 hover:border-slate-600 rounded-lg text-slate-300 hover:text-white transition-all bg-transparent cursor-pointer"
        >
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase font-medium">
            Вход в пространство
          </span>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-200 group-hover:translate-x-1 transition-all" />
        </motion.button>
      </div>

      {/* Underside status note */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center pointer-events-none opacity-30">
        <span className="text-[9px] font-mono text-slate-600 tracking-widest text-center">
          ЗГУ • NORILSK 2026
        </span>
      </div>
    </div>
  );
}
