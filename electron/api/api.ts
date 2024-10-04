import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { IpcMainAPIEntry } from "../typings/api";
import fs from "node:fs";
import path from "node:path";
import { ConfigData } from "../typings/config";
import { db, processDirectories } from "./file_indexer";
import { readConfig, writeConfig } from "../helpers/config";
// Database()

const configPath = path.join(app.getPath("userData"), "config.json");

export const loadIPCMainApi = (win: BrowserWindow) => {
  const ipcMainAPI: IpcMainAPIEntry[] = [
    {
      channel: "resize_win",
      action: "handle",
      listener: (_event, width: number, height: number) => {
        win.setContentSize(width, height);
      },
    },
    {
      channel: "select_dir",
      action: "handle",
      listener: async (
        _event,
        multiple: boolean,
      ): Promise<Electron.OpenDialogReturnValue> => {
        const selected = await dialog.showOpenDialog(win, {
          title: "Select photo directories",
          buttonLabel: "These will do",
          properties: multiple
            ? ["openDirectory", "multiSelections"]
            : ["openDirectory"],
        });
        return selected;
      },
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
      },
    },
    {
      channel: "write_config",
      action: "handle",
      listener: (_event, configData: ConfigData) => {
        const tag = "[API] [write_config] ";
        const data = JSON.stringify(configData, null, 2);
        fs.writeFileSync(configPath, data, "utf8");
        console.log(tag + "wrote config file");
        console.log(configPath);
        return { success: true };
      },
    },
    {
      channel: "index_files",
      action: "handle",
      listener: async (_event, paths: string[]) => {
        const BATCH_SIZE = 10;
        try {
          await processDirectories(paths, BATCH_SIZE);
          return { success: true };
        } catch (error) {
          return { error: "[INDEX ERROR] " + error };
        }
      },
    },
    {
      channel: "simple_search",
      action: "handle",
      listener: async (_event, query: string) => {
        try {
          const stmt = db.prepare(`
            SELECT * FROM images
            WHERE filename LIKE ?
          `);

          const results = stmt.all(`%${query}%`) as { path: string, filename: string }[];
          const new_results = results.map(p => { return {path: p.path, name: p.filename, ext: path.extname(p.path)}});
          return new_results;
        } catch (error) {
          console.error("Error performing simple search:", error);
          return [];
        }
      },
    },
  ];

  ipcMainAPI.forEach((api) => {
    ipcMain[api.action](api.channel, api.listener);
    console.log("loaded " + api.channel);
  });
};
