const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = process.env.ELECTRON_DEV === 'true' || process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
let serverProcess = null;

function startNext() {
  // Use npm run start to serve the built Next.js app
  serverProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start'], {
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: 'inherit',
  });

  serverProcess.on('error', (err) => {
    console.error('Error starting next:', err);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(`http://localhost:${port}`);
}

app.on('ready', async () => {
  if (!isDev) {
    startNext();
  }

  // Espera la URL del servidor sin depender de la librería externa `wait-on`.
  const waitForUrl = (url, { timeout = 30000, interval = 500 } = {}) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        try {
          const lib = url.startsWith('https') ? require('https') : require('http');
          const req = lib.request(url, { method: 'HEAD', timeout: 2000 }, (res) => {
            // cualquier respuesta indica que el servidor está arriba
            resolve();
          });
          req.on('error', () => {
            if (Date.now() - start >= timeout) return reject(new Error('Timeout waiting for ' + url));
            setTimeout(check, interval);
          });
          req.on('timeout', () => {
            req.destroy();
            if (Date.now() - start >= timeout) return reject(new Error('Timeout waiting for ' + url));
            setTimeout(check, interval);
          });
          req.end();
        } catch (err) {
          if (Date.now() - start >= timeout) return reject(err);
          setTimeout(check, interval);
        }
      };
      check();
    });
  };

  try {
    await waitForUrl(`http://localhost:${port}`, { timeout: 30000, interval: 500 });
    createWindow();
  } catch (err) {
    console.error('Timeout waiting for server:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
