
const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let overlayWindow;
let currentShortcut = store.get('shortcut') || 'CommandOrControl+Shift+V'; // Load saved shortcut or use default

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Mic Overlay',
    icon: path.join(__dirname, 'icon.ico')
  });

  mainWindow.loadFile('settings.html');
  
  mainWindow.on('closed', () => {
    app.quit();
  });

  mainWindow.setMenu(null);
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 400,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      permissions: [
        'audioCapture',
        'audioOutput'
      ]
    }
  });

  overlayWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'audioCapture'];
    callback(allowedPermissions.includes(permission));
  });

  overlayWindow.webContents.session.setDevicePermissionHandler((details) => {
    return true;
  });

  overlayWindow.loadFile('overlay.html');
  overlayWindow.setVisibleOnAllWorkspaces(true);
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
}

app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();

  // Load saved settings and register shortcut
  const savedSettings = store.get('voiceSettings');
  if (savedSettings) {
    overlayWindow.webContents.send('update-voice-settings', savedSettings);
    globalShortcut.register(currentShortcut, toggleOverlay);
    // Notify settings window of saved settings
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('load-saved-settings', {
        shortcut: currentShortcut,
        voiceSettings: savedSettings
      });
    });
  }
});

ipcMain.on('start-service', (event, shortcut, voiceSettings) => {
  // Only update shortcut if it's different from current
  if (shortcut !== currentShortcut) {
    globalShortcut.unregisterAll();
    currentShortcut = shortcut;
    globalShortcut.register(currentShortcut, toggleOverlay);
    store.set('shortcut', shortcut);
  }
  
  // Save and update voice settings
  store.set('voiceSettings', voiceSettings);
  overlayWindow.webContents.send('update-voice-settings', voiceSettings);
});

ipcMain.on('update-voice-settings', (event, settings) => {
  overlayWindow.webContents.send('update-voice-settings', settings);
});

// Add new IPC handler for toggle
ipcMain.on('toggle-overlay', () => {
  toggleOverlay();
});

// Add new IPC handler for shortcut updates
ipcMain.on('update-shortcut', (event, shortcut) => {
  globalShortcut.unregisterAll();
  currentShortcut = shortcut;
  globalShortcut.register(currentShortcut, toggleOverlay);
});

function toggleOverlay() {
  if (overlayWindow.isVisible()) {
    overlayWindow.hide();
  } else {
    overlayWindow.show();
    overlayWindow.focus();
    overlayWindow.webContents.send('focus-input');
  }
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('quit-app', () => {
  app.quit();
});

// Add zoom handlers
ipcMain.on('zoom-in', () => {
  const currentZoom = mainWindow.webContents.getZoomFactor();
  mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
});

ipcMain.on('zoom-out', () => {
  const currentZoom = mainWindow.webContents.getZoomFactor();
  mainWindow.webContents.setZoomFactor(currentZoom - 0.1);
}); 