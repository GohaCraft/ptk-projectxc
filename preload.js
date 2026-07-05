// Безопасный мост между Electron (main) и интерфейсом (renderer).
// contextIsolation включён, поэтому ipcRenderer пробрасываем строго через
// contextBridge — только нужный минимум: подписка на статус авто-обновления
// и кнопка «Перезапустить».
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronUpdater', {
  // cb получает { state: 'available'|'downloading'|'downloaded', version?, percent? }
  onStatus: (cb) => {
    const handler = (_event, data) => {
      try { cb(data); } catch {}
    };
    ipcRenderer.on('update-status', handler);
    // функция отписки
    return () => ipcRenderer.removeListener('update-status', handler);
  },
  // Перезапустить и установить скачанное обновление
  restart: () => ipcRenderer.send('update-restart'),
});
