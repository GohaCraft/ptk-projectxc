const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

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

    // Binding to port 0 tells Node to automatically request a guaranteed-free random port
    localServer.listen(0, '127.0.0.1', () => {
      const assignedPort = localServer.address().port;
      console.log(`[Offline Server] Running on port ${assignedPort}`);
      resolve(assignedPort);
    });

    localServer.on('error', (err) => {
      console.error('Server error:', err);
      reject(err);
    });
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "ZGU 3D Building Model & Blueprint Editor",
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Prevents any iframe/cross-origin local loading restrictions
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const port = await startEmbeddedServer();
    createWindow(port);
  } catch (err) {
    console.error("Initialization failed:", err);
    createWindow(null);
  }
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
