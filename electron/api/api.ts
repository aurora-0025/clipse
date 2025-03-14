import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { IpcMainAPIEntry } from "../typings/api";
import fs from "node:fs";
import path from "node:path";
import { ConfigData } from "../typings/config";
import { db, processDirectories } from "./file_indexer";
import { readConfig, writeConfig } from "../helpers/config";
const API_BASE_URL = 'http://localhost:8000';
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
      channel: "start_drag",
      action: "on",
      listener: async (event, filePaths: string[]) => {
        console.log(filePaths);
        
        for (let i = 0; i < filePaths.length; i++) {
          const path = filePaths[i];
          event.sender.startDrag({
            file: path,
            icon: path,
          });
        }
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

          const results = stmt.all(`%${query.split(" ").join("_")}%`) as {
            path: string;
            filename: string;
          }[];
          const new_results = results.map((p) => {
            return {
              path: p.path,
              name: p.filename,
              ext: path.extname(p.path),
            };
          });
          return new_results;
        } catch (error) {
          console.error("Error performing simple search:", error);
          return [];
        }
      },
    },
    {
      channel: "vector_search",
      action: "handle",
      listener: async (_event, query: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/search`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query })
          });

          if (response.ok) {
              const data = await response.json();
              console.log(data);
              const result = data.results.map((p: {
                path: string;
                mode: "CLIP" | "OCR";
                distance: number;
              })=> {
                return {
                  path: p.path,
                  name: p.path.split(/[/\\]/).pop(),
                  ext: path.extname(p.path),
                  mode: p.mode,
                  distance: p.distance
                };
              })              
              return result
          } else {
              const errorData = await response.json();
              console.error(errorData);
              return [];
          }
      } catch (error) {
          console.error("Error searching images:", error);
          return [];
      }
      },
    },
    {
      channel: "get_all_images",
      action: "handle",
      listener: async () => {
        try {
          const stmt = db.prepare("SELECT * FROM images");
          const images = stmt.all();
          return images;
        } catch (error) {
          console.error("Error fetching images:", error);
          return [];
        }
      },
    },
    {
      channel: "window_minimize",
      action: "on",
      listener: () => {
        win.minimize();
      },
    },
    {
      channel: "window_close",
      action: "on",
      listener: () => {
        win.close();
      },
    },
    {
      channel: "open_file",
      action: "handle",
      listener: async (_event, filePath: string) => {
        return shell.openPath(filePath);
      }
    }
  ];

  ipcMainAPI.forEach((api) => {
    ipcMain[api.action](api.channel, api.listener);
    console.log("loaded " + api.channel);
  });
};
