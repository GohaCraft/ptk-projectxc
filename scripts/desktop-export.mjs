// Десктоп-экспорт: статическая сборка Next.js для упаковки в Electron (.exe).
//
// Проблема: маршруты app/api/* помечены force-dynamic и ломают `output: export`.
// В офлайн-приложении они не нужны (погода/прокси просто молча не работают).
// Решение: на время экспорт-сборки временно убираем app/api в сторону,
// собираем статику, затем ВСЕГДА возвращаем папку на место.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'app', 'api');
const stash = path.join(root, 'app', '_api_export_disabled');

let moved = false;
try {
  if (fs.existsSync(apiDir)) {
    if (fs.existsSync(stash)) fs.rmSync(stash, { recursive: true, force: true });
    fs.renameSync(apiDir, stash);
    moved = true;
    console.log('[desktop-export] app/api временно отключён для статического экспорта');
  }

  process.env.EXPORT_MODE = 'true';
  execSync('npx next build', { stdio: 'inherit', cwd: root, env: process.env });
  console.log('[desktop-export] Готово: статический экспорт в ./out');
} finally {
  if (moved) {
    if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true, force: true });
    fs.renameSync(stash, apiDir);
    console.log('[desktop-export] app/api возвращён на место');
  }
}
