const electron = require('electron');
const fspath = require('path');
const url = require('url');
const app = electron.app;
const shell = electron.shell;
const Menu = electron.Menu;
const Tray = electron.Tray;
const dialog = electron.dialog;
const ipcMain = electron.ipcMain;
const crashReporter = electron.crashReporter;
const BrowserWindow = electron.BrowserWindow;
const nativeImage = require('electron').nativeImage;
const options = { extraHeaders: 'pragma: no-cache\n' }
const app_icon = nativeImage.createFromPath(fspath.join(__dirname, 'icon.png'));
let mainWindow, splashWindow;
var contextMenu = null;
var filepath = null;
var quitapp, URL;

function sleep(millis){
    var date = new Date();
    var curDate = null;
    do { curDate = new Date(); }
    while (curDate - date < millis);
}

crashReporter.start({ productName: 'OpenPDF VGSoft', companyName: 'VGSoft', submitURL: '', autoSubmit: false});
// Create menu for menu bar

const template = [{
        label: 'File',
        submenu: [{
            label: 'Open PDF',
            accelerator: 'CmdOrCtrl+O',
            click: function(item, focusedWindow){
                if(focusedWindow){
                    dialog.showOpenDialog({
                        filters: [{
                            name: 'PDF', extensions: ['pdf'] 
                    }],
                        properties: ['openFile']
                    },
                    function(path){
                        if(path){
                            filepath = path;
                            if(path.constructor === Array)
                                path = path[0];
                            mainWindow.loadURL('file://' + __dirname + '/pdfviewer/web/viewer.html?file=' + encodeURIComponent(path), options);
                        }
                    });
                }
            }
        },
        /*{
            label: 'Open Containing Folder',
            accelerator: 'CmdOrCtrl+F',
            click: function(item, focusedWindow){
                if(focusedWindow && filepath)
                    shell.showItemInFolder("file:///" + filepath);
            }
        },*/
        {
            label: 'Print Page',
            accelerator: 'CmdOrCtrl+P',
            click: function(item, focusedWindow){
                if (focusedWindow) focusedWindow.webContents.print();
            }
        },
        {
            label: 'Close PDF',
            accelerator: 'Shift+CmdOrCtrl+Z',
            click: function(item, focusedWindow){
                if(focusedWindow) focusedWindow.loadURL('file://' + __dirname + '/default.html', options);
            }
        },
        {
            type: 'separator'
        },
        {
            label: 'Exit',
            accelerator: 'Alt+F4',
            role: 'close'
        },
        ]
    },
    {
        label:'Edit',
        submenu: [
            { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo'},
            { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo'},
            { type: 'separator'},
            { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy'},
            { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectall'},
        ]
    },
    {
        label: 'View',
        submenu: [{
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: function(item, focusedWindow){
                if(focusedWindow)
                    focusedWindow.webContents.reloadIgnoringCache();
            }
        },
        {
            label:'Toggle Full Screen',
            accelerator: (function(){
                if(process.platform == 'darwin')
                    return 'Ctrl+Command+F';
                else
                    return 'F11';
            })(),
            click: function(item, focusedWindow){
                if(focusedWindow)
                    focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
        },
        ]
    },
    {
        label: 'Window',
        role: 'window',
        submenu: [
            { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize'},
            { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close'},
        ]
    },
    {
        label: 'Ajuda',
        role: 'help',
        submenu: [{
            label: 'Sobre',
            click: function() {
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    buttons: ['OK'],
                    title: 'OpenPDF VGSoft 1.0',
                    message: 'Version 1.0',
                    detail: 'Created By - Gomes. Vinicios Software Engineer, for CONTEC.',
                    icon: app_icon
                });
            }
        },
//        { label: 'Learn More', click: function(){ shell.openExternal('https://github.com/vinicios-gomes/'); } },
    ]
},
];

var menu = Menu.buildFromTemplate(template);
var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory){

    if(mainWindow){
        if(mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});
if(shouldQuit) { app.quit(); return; }
app.on('ready', function(){
    splashwindow = new BrowserWindow({ width: 400,
        height: 300, 
        center: true, 
        resizable: false, 
        movable: false, 
        alwaysOnTop: true, 
        skipTaskbar: true, 
        frame: false});
    splashwindow.loadURL('file://' + __dirname + '/splash.html');
    contextMenu = Menu.buildFromTemplate([
        {label: 'Minimize', type: 'radio', role: 'minimize'},
        {type: 'separator'},
        { label: 'Exit', type: 'radio', role: 'close'},
    ]);
    if (app.dock){
        app.dock.setIcon(app_icon);
        app.dock.setMenu(contextMenu);
    }
    Menu.setApplicationMenu(menu);
    const appIcon = new Tray(app_icon);
    appIcon.setToolTip('PDF Viewer');
    appIcon.setContextMenu(contextMenu);

    setTimeout(createWindow, 3000);
});

app.on('window-all-closed', function() {
    if ( process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', function(){
    if(mainWindow === null) {
        createWindow();
    }
});

function createWindow(){
    mainWindow = new BrowserWindow({
        minWidth: 400, 
        minHeight: 300, 
        width: 800, 
        height:600, 
        show: false, 
        icon: app_icon, 
        webPreferences: {
            nodeIntegration: false,
            defaultEncoding: 'UTF-8'
        }
    });
    mainWindow.on('close', function(e){
        e.preventDefault();
        mainWindow.webContents.clearHistory();
        mainWindow.webContents.session.clearCache(function(){
            mainWindow.destroy();
        });
    });
    mainWindow.on('closed', function(){
        mainWindow = null;
        app.quit();
    });
    mainWindow.webContents.on('new-window', function(e, url){
        e.preventDefault();
        shell.openExternal(url);
    });
    mainWindow.webContents.on('devtools-opened', function(e){
        e.preventDefault();
        shell.closeDevTools();
    });
    mainWindow.webContents.on('will-navigate', function(e, url){
        e.preventDefault();
        shell.openExternal(url);
    });
    mainWindow.loadURL('file://' + __dirname + '/default.html', options);
    mainWindow.once('ready-to-show', () =>{
        splashwindow.close();
        splashwindow = null;
        mainWindow.maximize();
        mainWindow.show();
    });
}