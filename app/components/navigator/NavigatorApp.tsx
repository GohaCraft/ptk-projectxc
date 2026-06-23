"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, RotateCcw, Sun, Moon, MapPin, Layers, Delete, Navigation2 } from "lucide-react";
import { NAV, ROOM_NAMES } from "../data/navigatorData";
import NavigatorMap from "./NavigatorMap";
import AmbientBg from "./AmbientBg";

const FLOORS = NAV.floors;
const IDLE_MS = 60_000; // авто-сброс при бездействии

export default function NavigatorApp() {
  const [dark, setDark] = useState(false);
  const [floor, setFloor] = useState<number>(1);
  const [target, setTarget] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Авто-сброс при бездействии
  useEffect(() => {
    const reset = () => { setTarget(null); setFloor(1); setQuery(""); };
    const arm = () => {
      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(reset, IDLE_MS);
    };
    const evs = ["pointerdown", "keydown", "wheel", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => { evs.forEach((e) => window.removeEventListener(e, arm)); if (idle.current) clearTimeout(idle.current); };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROOM_NAMES.filter((n) => !q || n.toLowerCase().includes(q));
  }, [query]);

  const selectRoom = (room: string) => {
    setTarget(room);
    setFloor(1); // маршрут всегда начинается от входа «ВЫ ЗДЕСЬ»
  };

  const reset = () => { setTarget(null); setFloor(1); setQuery(""); };

  // Подсказка-инструкция по текущему состоянию маршрута
  const hint = useMemo(() => {
    if (!target) return null;
    const tf = NAV.rooms[target].floor;
    if (tf === 1) return "Идите по синей линии со стрелками до отметки «ЦЕЛЬ».";
    if (floor === 1) return `Идите по синей линии до оранжевого круга и нажмите его — поднимитесь на ${tf} этаж.`;
    if (floor === tf) return "Идите по синей линии до отметки «ЦЕЛЬ».";
    return `Кабинет «${target}» находится на ${tf} этаже.`;
  }, [target, floor]);

  // ── палитра темы ──
  const T = dark
    ? { bg: "#0b1220", side: "#0f1830", card: "#16213f", text: "#e6edf7", sub: "#8aa0c2", border: "#23304f", chip: "#1b2742", chipActive: "#2563eb" }
    : { bg: "#eef2f7", side: "#ffffff", card: "#f5f8fc", text: "#102a4c", sub: "#5b6b82", border: "#dbe5f1", chip: "#eaf1fa", chipActive: "#2563eb" };

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden select-none" style={{ background: T.bg, color: T.text }}>
      {/* ── Верхняя панель ── */}
      <div className="flex items-center justify-between px-6 shrink-0" style={{ height: 64, background: dark ? "#0d1730" : "#2563eb" }}>
        <div className="flex items-center gap-3 text-white">
          <Navigation2 size={26} strokeWidth={2.4} />
          <span className="text-2xl font-extrabold tracking-wide">Навигатор</span>
          <span className="text-sm font-medium opacity-80 ml-2 hidden md:inline">Политехнический колледж</span>
        </div>
        <img src="/navigator/zgu.png" alt="ЗГУ" style={{ height: 40 }} />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Боковая панель ── */}
        <div className="flex flex-col shrink-0 p-5 gap-4" style={{ width: 430, background: T.side, borderRight: `1px solid ${T.border}` }}>
          <div>
            <div className="text-3xl font-extrabold mb-1">Куда вам нужно?</div>
            <div className="text-sm" style={{ color: T.sub }}>Введите номер кабинета или выберите из списка</div>
          </div>

          {/* Поиск */}
          <div className="flex items-center gap-3 px-4 rounded-2xl" style={{ height: 60, background: T.card, border: `2px solid ${query ? T.chipActive : T.border}` }}>
            <Search size={24} style={{ color: T.sub }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Напр. 305 или «Столовая»"
              className="bg-transparent outline-none w-full text-xl font-semibold"
              style={{ color: T.text }}
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-sm font-bold px-2" style={{ color: T.sub }}>✕</button>
            )}
          </div>

          {/* Экранная цифровая клавиатура (киоск без клавиатуры) */}
          <div className="grid grid-cols-5 gap-2">
            {keypad.map((d) => (
              <button
                key={d}
                onClick={() => setQuery((q) => q + d)}
                className="rounded-xl text-2xl font-extrabold transition-transform active:scale-95"
                style={{ height: 52, background: T.chip, color: T.text, border: `1px solid ${T.border}` }}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setQuery((q) => q.slice(0, -1))}
              className="rounded-xl flex items-center justify-center transition-transform active:scale-95 col-span-2"
              style={{ height: 52, background: T.chip, color: T.text, border: `1px solid ${T.border}` }}
            >
              <Delete size={22} />
            </button>
            <button
              onClick={() => setQuery("")}
              className="rounded-xl text-base font-bold transition-transform active:scale-95 col-span-3"
              style={{ height: 52, background: T.chip, color: T.sub, border: `1px solid ${T.border}` }}
            >
              Очистить
            </button>
          </div>

          {/* Список кабинетов */}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: T.sub }}>
            <MapPin size={14} /> Кабинеты {query && `· найдено ${matches.length}`}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-none flex flex-col gap-1.5">
            {matches.length === 0 && (
              <div className="text-center text-sm py-6" style={{ color: T.sub }}>Ничего не найдено</div>
            )}
            {matches.map((room, i) => {
              const active = room === target;
              return (
                <button
                  key={room}
                  onClick={() => selectRoom(room)}
                  className="nav-slide-in flex items-center justify-between px-4 rounded-xl text-left transition-colors active:scale-[0.99]"
                  style={{
                    animationDelay: `${Math.min(i, 12) * 28}ms`,
                    minHeight: 48,
                    background: active ? T.chipActive : T.chip,
                    color: active ? "#fff" : T.text,
                    border: `1px solid ${active ? T.chipActive : T.border}`,
                  }}
                >
                  <span className="text-lg font-bold">{room}</span>
                  <span className="text-xs font-semibold opacity-70">{NAV.rooms[room].floor} эт.</span>
                </button>
              );
            })}
          </div>

          {/* Низ: сброс + смена темы */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl font-bold text-white transition-transform active:scale-95"
              style={{ height: 50, background: "#ef4444" }}
            >
              <RotateCcw size={18} /> Сброс
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Светлая тема" : "Тёмная тема"}
              title={dark ? "Светлая тема" : "Тёмная тема"}
              className="flex items-center justify-center rounded-xl transition-transform active:scale-90"
              style={{ width: 50, height: 50, background: T.chip, color: dark ? "#fbbf24" : "#6366f1", border: `1px solid ${T.border}` }}
            >
              <span className="nav-theme-icon" style={{ display: "inline-flex", transform: dark ? "rotate(180deg)" : "rotate(0deg)" }}>
                {dark ? <Sun size={22} /> : <Moon size={22} />}
              </span>
            </button>
          </div>
        </div>

        {/* ── Карта ── */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <AmbientBg dark={dark} />
          <div className="absolute inset-0 z-[1]">
            <NavigatorMap floor={floor} targetRoom={target} onStairClick={setFloor} dark={dark} />
          </div>
          {/* Переключатель этажей сверху */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2 py-2 rounded-2xl shadow-xl" style={{ background: T.side, border: `1px solid ${T.border}` }}>
            <span className="text-xs font-bold uppercase tracking-wider px-2 flex items-center gap-1" style={{ color: T.sub }}><Layers size={14} /> Этаж</span>
            {FLOORS.map((f) => {
              const active = f === floor;
              return (
                <button
                  key={f}
                  onClick={() => setFloor(f)}
                  className="rounded-xl font-extrabold transition-transform active:scale-95"
                  style={{
                    minWidth: 46, height: 40,
                    background: active ? T.chipActive : T.chip,
                    color: active ? "#fff" : T.text,
                    border: `1px solid ${active ? T.chipActive : T.border}`,
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {/* Подсказка-инструкция снизу */}
          {hint && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 max-w-[80%] px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3" style={{ background: T.side, border: `1px solid ${T.border}` }}>
              <Navigation2 size={20} style={{ color: T.chipActive }} className="shrink-0" />
              <span className="text-base font-semibold" style={{ color: T.text }}>{hint}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
