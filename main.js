const { app, BrowserWindow } = require('electron');
const Store = require('electron-store');

Store.initRenderer(); 

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 720,
        icon: __dirname + '/asset/Logo.ico', // Menambahkan ikon kustom
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false // PENTING: Agar timer tetap akurat di background
        }
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});