const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

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

  try {
    await waitOn({ resources: [`http://localhost:${port}`], timeout: 30000 });
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
