// Глобальный список активных ошибок (по номерам из errorCodes.ts).
// Любой модуль может сообщить об ошибке reportError(код) и снять её clearError(код).
// ErrorOverlay подписывается и показывает плашку с номерами.

type Listener = (codes: number[]) => void;

const active = new Set<number>();
const listeners = new Set<Listener>();

function notify() {
  const snapshot = Array.from(active).sort((a, b) => a - b);
  listeners.forEach((l) => l(snapshot));
}

export function reportError(code: number) {
  if (!active.has(code)) {
    active.add(code);
    notify();
  }
}

export function clearError(code: number) {
  if (active.has(code)) {
    active.delete(code);
    notify();
  }
}

export function subscribeErrors(l: Listener): () => void {
  listeners.add(l);
  l(Array.from(active).sort((a, b) => a - b));
  return () => { listeners.delete(l); };
}
