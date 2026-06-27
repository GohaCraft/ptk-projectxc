"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, RotateCcw, Sun, Moon, MapPin, Layers, Delete, Navigation2, ArrowLeft, Box as BoxIcon } from "lucide-react";
import { NAV, ROOM_NAMES } from "../data/navigatorData";
import NavigatorMap from "./NavigatorMap";
import AmbientBg from "./AmbientBg";

const FLOORS = NAV.floors;
const IDLE_MS = 60_000; // авто-сброс при бездействии

export default function NavigatorApp() {
  // По умолчанию тёмная «стеклянная» тема — в одном языке с 3D-моделью.
  const [dark, setDark] = useState(true);
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
    if (floor === tf) return "Идите по синей линии до отметки «ЦЕЛЬ».";
    if (floor < tf) return "Идите по синей линии до оранжевого круга и нажмите его — подниметесь на следующий этаж.";
    return `Кабинет «${target}» находится на ${tf} этаже.`;
  }, [target, floor]);

  // ── палитра темы (тёмная = язык 3D-модели: глубокий фон, бирюзово-голубые акценты) ──
  const T = dark
    ? { bg: "#070b14", side: "#0b1220", card: "#101c33", text: "#eaf1fb", sub: "#8aa0c2", border: "#1d2b48", chip: "#13203a", chipActive: "#0ea5e9" }
    : { bg: "#eef2f7", side: "#ffffff", card: "#f5f8fc", text: "#102a4c", sub: "#5b6b82", border: "#dbe5f1", chip: "#eaf1fa", chipActive: "#0ea5e9" };

  const keypad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden select-none" style={{ background: T.bg, color: T.text }}>
      {/* ── Верхняя панель: тёмное стекло в стиле 3D-меню ── */}
      <div
        className="flex items-center justify-between px-6 shrink-0 border-b"
        style={{ height: 66, background: "linear-gradient(180deg,#0b1220,#0a0f1c)", borderColor: "#15233e" }}
      >
        <div className="flex items-center gap-3 text-slate-100">
          <button
            onClick={() => window.location.assign('/')}
            title="На главную"
            className="group flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-teal-300/25 hover:border-teal-300/70 transition-colors font-semibold text-slate-200 hover:text-white"
          >
            <ArrowLeft size={18} strokeWidth={2.4} className="text-teal-300 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden md:inline text-sm">На главную</span>
          </button>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_2px_rgba(56,189,248,0.6)] ml-1" />
          <Navigation2 size={24} strokeWidth={2.4} className="text-sky-400" />
          <span className="menu-text-shimmer text-2xl font-extrabold tracking-wide bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">
            Навигатор
          </span>
          <span className="text-sm font-medium text-slate-400 ml-1 hidden md:inline">Политехнический колледж</span>
        </div>
        <img src="/navigator/zgu.png" alt="ЗГУ" style={{ height: 40 }} />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Боковая панель ── */}
        <div className="flex flex-col shrink-0 p-5 gap-4" style={{ width: 430, background: T.side, borderRight: `1px solid ${T.border}` }}>
          <div>
            <div className="text-3xl font-extrabold mb-1 bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">
              Куда вам нужно?
            </div>
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

          {/* Кнопка перехода в изолированный 3D-кабинет (только когда выбран) */}
          {target && (
            <button
              onClick={() => window.location.assign(`/room?id=${encodeURIComponent(target)}`)}
              className="shrink-0 flex items-center justify-center gap-2.5 rounded-2xl font-bold text-white transition-transform active:scale-[0.98]"
              style={{
                height: 56,
                background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                boxShadow: "0 14px 34px -12px rgba(14,165,233,0.7)",
              }}
            >
              <BoxIcon size={20} /> Смотреть кабинет в 3D
            </button>
          )}

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
