import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  nativeImage,
  protocol,
  Tray,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadIPCMainApi } from "./api/api";
import { startWatcher, stopAllWatchers } from "./helpers/watcher";
import { configData, readConfig } from "./helpers/config";
import { db, startInitialIndex } from "./api/file_indexer";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let tray = null;

function createWindow() {
  win = new BrowserWindow({
    vibrancy: "fullscreen-ui", // on MacOS
    // backgroundMaterial: "acrylic",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    minWidth: 800,
    minHeight: 600,
    frame: false,
    center: true,
    resizable: true,
    minimizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // win.hide();

  globalShortcut.register("CommandorControl + Alt + space", () => {
    if (win?.isVisible()) {
      win.hide();
    } else {
      win?.show();
      win?.focus();
    }
  });

  win.webContents.openDevTools();

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  loadIPCMainApi(win!);

  // win?.on("blur", () => {
  //   if (configData?.paths && configData.paths.length > 0) {
  //     win?.hide();
  //   }
  // });
}
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopAllWatchers();
    db.close();
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// const protocolName = "clipse";
// protocol.registerSchemesAsPrivileged([
//   { scheme: protocolName, privileges: { bypassCSP: true } }
// ])

app.whenReady().then(async () => {
  protocol.registerFileProtocol("clipse", (request, callback) => {
    const url = request.url.replace("clipse://", "");
    try {
      return callback(url);
    } catch (err) {
      console.error(err);
      return callback("404");
    }
  });
  tray = new Tray(
    nativeImage.createFromPath(
      path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    ),
  );
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        win?.show();
        win?.focus();
      },
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip("This is my application.");
  tray.setContextMenu(contextMenu);
  const configPaths = readConfig()?.paths as string[];
  if (configPaths) {
    console.log("Started Initial Indexing!");
    await startInitialIndex(configPaths);
    console.log("Finished Initial Indexing!");
    // console.log("Started watcher!");
    // await startWatcher(configPaths);
  }
  createWindow();
});
