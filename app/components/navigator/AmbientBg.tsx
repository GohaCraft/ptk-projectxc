"use client";

import React, { useMemo } from "react";

// детерминированный ПсевдоСлучай (без Math.random — чтобы не было рассинхрона при гидрации)
function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function AmbientBg({ dark }: { dark: boolean }) {
  const stars = useMemo(() => {
    const r = seeded(7);
    return Array.from({ length: 46 }, () => ({
      left: r() * 100,
      top: r() * 100,
      size: 1 + r() * 2.4,
      dur: 2.5 + r() * 4,
      delay: r() * 5,
    }));
  }, []);

  if (dark) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* глубокий фон */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 120% at 50% 0%, #111d3a 0%, #0a1020 55%, #070b16 100%)" }} />
        {/* мягкие свечения */}
        <div className="absolute nav-blob" style={{ ["--dur" as any]: "26s", left: "8%", top: "12%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)", filter: "blur(20px)" }} />
        <div className="absolute nav-blob" style={{ ["--dur" as any]: "32s", right: "6%", bottom: "8%", width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.16), transparent 70%)", filter: "blur(24px)" }} />
        {/* звёзды */}
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute nav-twinkle"
            style={{
              ["--dur" as any]: `${s.dur}s`,
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background: "#cdd9f5",
              animationDelay: `${s.delay}s`,
              boxShadow: "0 0 4px rgba(205,217,245,0.8)",
            }}
          />
        ))}
      </div>
    );
  }

  // светлая тема — мягкие дрейфующие «облака»
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #eef4fb 0%, #e3ecf7 100%)" }} />
      <div className="absolute nav-blob" style={{ ["--dur" as any]: "20s", left: "-4%", top: "8%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.18), transparent 70%)", filter: "blur(26px)" }} />
      <div className="absolute nav-blob" style={{ ["--dur" as any]: "27s", right: "-2%", top: "30%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,0.16), transparent 70%)", filter: "blur(26px)" }} />
      <div className="absolute nav-blob" style={{ ["--dur" as any]: "23s", left: "30%", bottom: "-6%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.14), transparent 70%)", filter: "blur(30px)" }} />
    </div>
  );
}
