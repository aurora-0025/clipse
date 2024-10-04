import { app, ipcMain, dialog, BrowserWindow, protocol, net, Tray, nativeImage, Menu, globalShortcut } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { createRequire } from "node:module";
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const require$1 = createRequire(import.meta.url);
const db = require$1("better-sqlite3")("file_index.sqlite", {});
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    imageid INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT,
    hash TEXT,
    filename TEXT,
    ctime TIMESTAMP,
    mtime TIMESTAMP
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    tagid INTEGER PRIMARY KEY AUTOINCREMENT,
    tagname TEXT
  );
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS image_tags (
    imageid INTEGER NOT NULL REFERENCES images ON DELETE CASCADE,
    tagid INTEGER NOT NULL REFERENCES tags ON DELETE CASCADE
  );
`);
function computeFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}
async function getFileStats(filePath) {
  return await stat(filePath);
}
async function processFile(filePath) {
  try {
    const fileStats = await getFileStats(filePath);
    const mtimeMs = fileStats.mtimeMs;
    const filename = path.basename(filePath, path.extname(filePath));
    const pathExists = db.prepare("SELECT * FROM images WHERE path = ?").get(filePath);
    if (pathExists) {
      if (pathExists.mtime === mtimeMs) {
        console.log(`No change for ${filePath}`);
        return;
      } else {
        console.log(`File modified, recomputing hash for ${filePath}`);
        const newHash = computeFileHash(filePath);
        const hashExists = db.prepare("SELECT * FROM images WHERE hash = ?").get(newHash);
        if (hashExists) {
          db.prepare("UPDATE images SET path = ?, filename = ?, mtime = ? WHERE hash = ?").run(
            filePath,
            filename,
            mtimeMs,
            newHash
          );
          console.log(`File moved, path updated for ${filePath}`);
        } else {
          db.prepare("UPDATE images SET hash = ?, filename = ?, mtime = ? WHERE path = ?").run(
            newHash,
            filename,
            mtimeMs,
            filePath
          );
          console.log(`File hash and mtime updated for ${filePath}`);
        }
      }
    } else {
      const fileHash = computeFileHash(filePath);
      const hashExists = db.prepare("SELECT * FROM images WHERE hash = ?").get(fileHash);
      if (hashExists) {
        db.prepare("UPDATE images SET path = ?, filename = ?, mtime = ? WHERE hash = ?").run(
          filePath,
          filename,
          mtimeMs,
          fileHash
        );
        console.log(`File moved, path updated for ${filePath}`);
      } else {
        const ctimeMs = fileStats.ctimeMs;
        db.prepare("INSERT INTO images (path, hash, filename, ctime, mtime) VALUES (?, ?, ?, ?, ?)").run(
          filePath,
          fileHash,
          filename,
          ctimeMs,
          mtimeMs
        );
        console.log(`New file inserted into SQLite for ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}
function isImageFile(filePath) {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg", ".webp"];
  return imageExtensions.includes(path.extname(filePath).toLowerCase());
}
async function processFilesInBatches(paths, batchSize) {
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}`);
    await Promise.all(batch.map((filePath) => processFile(filePath)));
  }
}
function deleteUnprocessedPaths(validPaths) {
  const placeholders = validPaths.map(() => "?").join(",");
  const sql = `DELETE FROM images WHERE path NOT IN (${placeholders})`;
  try {
    const stmt = db.prepare(sql);
    stmt.run(...validPaths);
    console.log("Unprocessed paths deleted from SQLite");
  } catch (error) {
    console.error("Error deleting unprocessed paths:", error);
  }
}
async function findImageFiles(directory) {
  let results = [];
  const files = await readdir(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      const subDirFiles = await findImageFiles(filePath);
      results = results.concat(subDirFiles);
    } else if (isImageFile(filePath)) {
      results.push(filePath);
    }
  }
  return results;
}
async function processDirectories(directories, batchSize) {
  try {
    let allImageFiles = [];
    for (const directory of directories) {
      const imageFiles = await findImageFiles(directory);
      allImageFiles = allImageFiles.concat(imageFiles);
    }
    console.log(`Found ${allImageFiles.length} image files`);
    await processFilesInBatches(allImageFiles, batchSize);
    deleteUnprocessedPaths(allImageFiles);
  } catch (error) {
    console.error("Error processing directories:", error);
  }
}
async function startInitialIndex(paths) {
  await processDirectories(paths, 10);
}
const readConfig = () => {
  const configPath2 = path.join(app.getPath("userData"), "config.json");
  if (fs.existsSync(configPath2)) {
    const config = JSON.parse(fs.readFileSync(configPath2, "utf-8"));
    return config || null;
  } else {
    console.log("Config file not found");
    return null;
  }
};
const writeConfig = (config) => {
  const configPath2 = path.join(app.getPath("userData"), "config.json");
  if (!config) {
    config = {
      paths: []
    };
  }
  const data = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath2, data, "utf8");
  return config;
};
const configPath = path.join(app.getPath("userData"), "config.json");
const loadIPCMainApi = (win2) => {
  const ipcMainAPI = [
    {
      channel: "resize_win",
      action: "handle",
      listener: (_event, width, height) => {
        win2.setContentSize(width, height);
      }
    },
    {
      channel: "select_dir",
      action: "handle",
      listener: async (_event, multiple) => {
        const selected = await dialog.showOpenDialog(win2, {
          title: "Select photo directories",
          buttonLabel: "These will do",
          properties: multiple ? ["openDirectory", "multiSelections"] : ["openDirectory"]
        });
        return selected;
      }
    },
    {
      channel: "read_config",
      action: "handle",
      listener: (_event) => {
        let config = readConfig();
        if (!config) {
          config = writeConfig();
        }
        return config;
      }
    },
    {
      channel: "write_config",
      action: "handle",
      listener: (_event, configData) => {
        const tag = "[API] [write_config] ";
        const data = JSON.stringify(configData, null, 2);
        fs.writeFileSync(configPath, data, "utf8");
        console.log(tag + "wrote config file");
        console.log(configPath);
        return { success: true };
      }
    },
    {
      channel: "index_files",
      action: "handle",
      listener: async (_event, paths) => {
        const BATCH_SIZE = 10;
        try {
          await processDirectories(paths, BATCH_SIZE);
          return { success: true };
        } catch (error) {
          return { error: "[INDEX ERROR] " + error };
        }
      }
    },
    {
      channel: "simple_search",
      action: "handle",
      listener: async (_event, query) => {
        try {
          const stmt = db.prepare(`
            SELECT * FROM images
            WHERE filename LIKE ?
          `);
          const results = stmt.all(`%${query}%`);
          const new_results = results.map((p) => {
            return { path: p.path, name: p.filename, ext: path.extname(p.path) };
          });
          return new_results;
        } catch (error) {
          console.error("Error performing simple search:", error);
          return [];
        }
      }
    }
  ];
  ipcMainAPI.forEach((api) => {
    ipcMain[api.action](api.channel, api.listener);
    console.log("loaded " + api.channel);
  });
};
const require2 = createRequire(import.meta.url);
const watcher = require2("@parcel/watcher");
const subscriptions = [];
const startWatcher = async (paths) => {
  if (paths.length === 0) {
    console.log("No paths to watch.");
    return;
  }
  const imageExtensionsGlob = "**/*.*(jpg|jpeg|png|gif|bmp|svg)";
  for (const watchPath of paths) {
    try {
      const sub = await watcher.subscribe(
        watchPath,
        async (err, events) => {
          if (err) {
            console.error(`Error watching path: ${watchPath}`, err);
            return;
          }
          for (const event of events) {
            console.log(event);
          }
        },
        {
          ignore: [`${!imageExtensionsGlob}`]
        }
      );
      subscriptions.push(sub);
    } catch (error) {
      console.error(`Failed to start watcher for path: ${watchPath}`, error);
    }
  }
};
const stopAllWatchers = async () => {
  if (subscriptions.length == 0) {
    console.log("there are currently no watchers running");
    return;
  } else {
    for (const sub of subscriptions) {
      await sub.unsubscribe();
    }
    console.log("All watchers have been stopped.");
  }
};
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let tray = null;
function createWindow() {
  win = new BrowserWindow({
    vibrancy: "fullscreen-ui",
    // on MacOS
    backgroundMaterial: "acrylic",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 600,
    height: 200,
    frame: false,
    center: true,
    resizable: false,
    minimizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    }
  });
  globalShortcut.register("CommandorControl + Alt + space", () => {
    if (win == null ? void 0 : win.isVisible()) {
      win.hide();
    } else {
      win == null ? void 0 : win.show();
      win == null ? void 0 : win.focus();
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  loadIPCMainApi(win);
  win == null ? void 0 : win.on("blur", () => {
    win == null ? void 0 : win.hide();
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopAllWatchers();
    db.close();
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
const protocolName = "clipse";
protocol.registerSchemesAsPrivileged([
  { scheme: protocolName, privileges: { bypassCSP: true } }
]);
app.whenReady().then(async () => {
  var _a;
  protocol.handle("clipse", (request) => {
    const filePath = request.url.slice("clipse://".length);
    return net.fetch(filePath);
  });
  tray = new Tray(nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, "electron-vite.svg")));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        win == null ? void 0 : win.show();
        win == null ? void 0 : win.focus();
      }
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      }
    }
  ]);
  tray.setToolTip("This is my application.");
  tray.setContextMenu(contextMenu);
  const configPaths = (_a = readConfig()) == null ? void 0 : _a.paths;
  if (configPaths) {
    console.log("Started Initial Indexing!");
    await startInitialIndex(configPaths);
    console.log("Finished Initial Indexing!");
    console.log("Started watcher!");
    await startWatcher(configPaths);
  }
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
