// Десктоп-экспорт: статическая сборка Next.js для упаковки в Electron (.exe).
//
// Проблема: маршруты app/api/* помечены force-dynamic и ломают `output: export`.
// В офлайн-приложении они не нужны (погода/прокси просто молча не работают).
// Решение: на время экспорт-сборки временно убираем app/api в сторону,
// собираем статику, затем ВСЕГДА возвращаем папку на место.
//
// Устойчивость: переименование папки иногда падает с EPERM/EBUSY, если файл
// держит OneDrive/антивирус/проводник. Поэтому операции с папкой делаем с
// повтором и понятной подсказкой, а не валимся сразу.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'app', 'api');
const stash = path.join(root, 'app', '_api_export_disabled');

const TRANSIENT = ['EPERM', 'EBUSY', 'EACCES', 'ENOTEMPTY'];

// Блокирующая пауза без busy-loop (скрипт синхронный).
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function hintLock(label, code) {
  console.error(`\n[desktop-export] Не получилось ${label} (${code}).`);
  console.error('Похоже, папку держит OneDrive / антивирус / проводник.');
  console.error('Что делать: вынеси проект из OneDrive (напр. C:\\dev\\ptk-projectxc),');
  console.error('или поставь синхронизацию OneDrive на паузу и повтори.\n');
}

// Выполняет операцию с папкой, повторяя при временных блокировках.
function withRetry(fn, label) {
  const max = 6;
  for (let i = 0; i < max; i++) {
    try {
      fn();
      return;
    } catch (e) {
      const transient = TRANSIENT.includes(e.code);
      if (!transient || i === max - 1) {
        if (transient) hintLock(label, e.code);
        throw e;
      }
      const wait = 400 * (i + 1);
      console.warn(`[desktop-export] ${label}: ${e.code} — повтор через ${wait}мс (${i + 1}/${max})...`);
      sleep(wait);
    }
  }
}

let moved = false;
try {
  if (fs.existsSync(apiDir)) {
    if (fs.existsSync(stash)) withRetry(() => fs.rmSync(stash, { recursive: true, force: true }), 'очистить старый _api_export_disabled');
    withRetry(() => fs.renameSync(apiDir, stash), 'временно убрать app/api');
    moved = true;
    console.log('[desktop-export] app/api временно отключён для статического экспорта');
  }

  process.env.EXPORT_MODE = 'true';
  // Поднимаем лимит памяти Node, иначе на больших сценах сборка падает с OOM
  const buildEnv = { ...process.env };
  const extraHeap = '--max-old-space-size=4096';
  buildEnv.NODE_OPTIONS = buildEnv.NODE_OPTIONS
    ? `${buildEnv.NODE_OPTIONS} ${extraHeap}`
    : extraHeap;
  execSync('npx next build', { stdio: 'inherit', cwd: root, env: buildEnv });
  console.log('[desktop-export] Готово: статический экспорт в ./out');
} finally {
  if (moved) {
    withRetry(() => {
      if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true, force: true });
      fs.renameSync(stash, apiDir);
    }, 'вернуть app/api на место');
    console.log('[desktop-export] app/api возвращён на место');
  }
}
