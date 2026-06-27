const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// ── Надёжный рендер 3D на любом железе (важно для слабого/проблемного киоска) ──
// Игнорируем чёрный список GPU и разрешаем программный рендер (SwiftShader),
// чтобы WebGL-контекст создавался ВСЕГДА — даже без нормальной видеокарты/драйвера.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-unsafe-swiftshader'); // программный WebGL как запасной путь
app.disableDomainBlockingFor3DAPIs();


// ── Авто-обновление с GitHub Releases (electron-updater) ─────────────────────
// Проверяет последнюю опубликованную версию в репозитории и тихо скачивает её,
// а после — предлагает перезапуститься. Работает только в собранном .exe.
function setupAutoUpdater() {
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (e) {
    console.log('[Updater] electron-updater не установлен — пропускаем авто-обновление.');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Доступна новая версия:', info && info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { state: 'available', version: info && info.version });
    }
  });

  autoUpdater.on('download-progress', (p) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', {
        state: 'downloading',
        percent: Math.round(p.percent),
        bytesPerSecond: p.bytesPerSecond,
        transferred: p.transferred,
        total: p.total,
      });
    }
  });

  // Тихая установка без окна установщика и без вопросов: isSilent=true,
  // isForceRunAfter=true (перезапустить уже новую версию).
  const installSilently = () => {
    try { autoUpdater.quitAndInstall(true, true); }
    catch (e) { console.warn('[Updater] quitAndInstall failed:', e && e.message); }
  };

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Обновление загружено:', info && info.version);
    // Показываем плашку «устанавливается», затем САМИ тихо ставим — без кнопок,
    // без окна установщика. Для киоска: опубликовал -> само обновилось.
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { state: 'downloaded', version: info && info.version });
    }
    setTimeout(installSilently, 6000);
  });

  // Кнопка «Установить сейчас» (необязательная) — поставить немедленно.
  ipcMain.on('update-restart', installSilently);

  autoUpdater.on('error', (err) => {
    console.warn('[Updater] Ошибка проверки обновлений:', err && err.message);
  });

  // Тихая проверка при запуске (не мешает, если нет интернета/релизов)
  autoUpdater.checkForUpdates().catch((err) => {
    console.warn('[Updater] checkForUpdates failed:', err && err.message);
  });
}

let mainWindow;
let localServer;
let localPort = 3000; // Will fall back to dev port if server isn't compiled

// A high-performance, zero-dependency static file server to host Next.js static export
// strictly locally and offline. This prevents CORS violations when loading 3D assets/images.
function startEmbeddedServer() {
  return new Promise((resolve, reject) => {
    const outPath = path.join(__dirname, 'out');

    // If 'out' folder doesn't exist, we fallback to development mode loading
    if (!fs.existsSync(outPath)) {
      console.log("'out' directory not found. Running in development mode (pointing directly to localhost:3000)...");
      return resolve(null);
    }

    localServer = http.createServer((req, res) => {
      try {
        // Decode request URL to parse filenames with spaces or cyrillic characters
        const decodedUrl = decodeURIComponent(req.url.split('?')[0]);
        let filePath = path.join(outPath, decodedUrl === '/' ? 'index.html' : decodedUrl);

        // Serve index.html for directories
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }

        // SPA-routing and extension resolver for Next.js static exports
        if (!fs.existsSync(filePath)) {
          const pathWithHtml = filePath + '.html';
          if (fs.existsSync(pathWithHtml)) {
            filePath = pathWithHtml;
          } else {
            // Next.js static export SPA fallback (404 page or index)
            const fallback404 = path.join(outPath, '404.html');
            filePath = fs.existsSync(fallback404) ? fallback404 : path.join(outPath, 'index.html');
          }
        }

        // Content MIME Types dictionary
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.wasm': 'application/wasm',
          '.gltf': 'model/gltf+json',
          '.glb': 'model/gltf-binary',
          '.bin': 'application/octet-stream'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
          if (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Internal Error: ${error.code}`);
          } else {
            res.writeHead(200, { 
              'Content-Type': contentType,
              'Access-Control-Allow-Origin': '*' // Extra CORS safety for 3D textures
            });
            res.end(content, 'utf-8');
          }
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error: ${err.message}`);
      }
    });

    // ВАЖНО: используем ФИКСИРОВАННЫЙ порт, а не 0 (случайный).
    // При случайном порте origin (http://127.0.0.1:<порт>) менялся каждый запуск,
    // поэтому localStorage сбрасывался — окно «Что нового» вылезало при каждом
    // старте, а сохранённые стены/тема/настройки терялись. Фикс-порт даёт
    // стабильный origin → данные сохраняются между запусками.
    const FIXED_PORT = 38217;
    const tryListen = (port, triesLeft) => {
      localServer.listen(port, '127.0.0.1', () => {
        const assignedPort = localServer.address().port;
        console.log(`[Offline Server] Running on port ${assignedPort}`);
        resolve(assignedPort);
      });
    };

    localServer.on('error', (err) => {
      // Если фикс-порт занят — берём случайный (origin изменится, но приложение
      // хотя бы запустится). В норме порт свободен.
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`[Offline Server] Порт ${FIXED_PORT} занят — беру случайный.`);
        localServer.listen(0, '127.0.0.1', () => {
          const assignedPort = localServer.address().port;
          console.log(`[Offline Server] Running on fallback port ${assignedPort}`);
          resolve(assignedPort);
        });
        return;
      }
      console.error('Server error:', err);
      reject(err);
    });

    tryListen(FIXED_PORT);
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    fullscreen: true, // киоск: сразу полноэкранный режим (как F11). Выход — F11.
    title: "ZGU 3D Building Model & Blueprint Editor",
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Prevents any iframe/cross-origin local loading restrictions
      preload: path.join(__dirname, 'preload.js'), // мост для статуса авто-обновления
    }
  });

  // Base URL selection: use embedded server port, or fall back to standard web-dev address
  const url = port ? `http://127.0.0.1:${port}` : 'http://localhost:3000';
  mainWindow.loadURL(url);

  // Auto-maximize on launch for a stunning immersive view
  mainWindow.maximize();

  // Clear or customize default menu
  Menu.setApplicationMenu(null);

  // Setup presentation shortcut keys:
  // - F11: Fullscreen toggle
  // - F12: Open developer tools (helpful for debugging)
  // - Ctrl+R / F5: Refresh interface
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') && input.type === 'keyDown') {
      mainWindow.reload();
      event.preventDefault();
    }
  });

  // ── Watchdog для киоска: авто-восстановление при сбое/зависании ──────────
  // Если рендер упал (вылет, потеря WebGL-контекста) или окно надолго зависло —
  // молча перезагружаем страницу, чтобы киоск не «умирал» до прихода человека.
  // Нарастающая пауза не даёт зациклиться, если что-то падает постоянно.
  let recovering = false;
  let crashCount = 0;
  let lastCrash = 0;
  let unresponsiveTimer = null;

  const recover = (reason) => {
    if (recovering || !mainWindow || mainWindow.isDestroyed()) return;
    recovering = true;
    const now = Date.now();
    if (now - lastCrash > 60000) crashCount = 0; // давно не падало — сбрасываем счётчик
    lastCrash = now;
    crashCount++;
    const delay = Math.min(1000 * crashCount, 8000);
    console.error(`[Watchdog] ${reason} — перезагрузка через ${delay}мс (попытка ${crashCount})`);
    setTimeout(() => {
      recovering = false;
      if (mainWindow && !mainWindow.isDestroyed()) {
        try { mainWindow.loadURL(url); } catch (e) { console.error('[Watchdog] reload failed:', e); }
      }
    }, delay);
  };

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    recover(`render-process-gone (${details && details.reason})`);
  });
  mainWindow.on('unresponsive', () => {
    if (unresponsiveTimer) return;
    unresponsiveTimer = setTimeout(() => recover('окно не отвечает > 12с'), 12000);
  });
  mainWindow.on('responsive', () => {
    if (unresponsiveTimer) { clearTimeout(unresponsiveTimer); unresponsiveTimer = null; }
  });

  mainWindow.on('closed', () => {
    if (unresponsiveTimer) { clearTimeout(unresponsiveTimer); unresponsiveTimer = null; }
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Автозапуск вместе с Windows (для киоска). Только в установленном .exe.
  if (app.isPackaged) {
    try { app.setLoginItemSettings({ openAtLogin: true, path: process.execPath }); }
    catch (e) { console.warn('[Autostart] setLoginItemSettings failed:', e && e.message); }
  }

  try {
    const port = await startEmbeddedServer();
    createWindow(port);
  } catch (err) {
    console.error("Initialization failed:", err);
    createWindow(null);
  }
  // Проверяем обновления с GitHub после старта окна
  setupAutoUpdater();
});

// Clean shut down
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (localServer) {
    localServer.close();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow(localPort);
  }
});
