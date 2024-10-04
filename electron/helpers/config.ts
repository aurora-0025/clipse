import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import { ConfigData } from "../typings/config";

export const readConfig = (): ConfigData | null =>  {
    const configPath = path.join(app.getPath("userData"), "config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config || null;
    } else {
      console.log('Config file not found');
      return null;
    }
}

export const writeConfig = (config?: ConfigData) => {
    const configPath = path.join(app.getPath("userData"), "config.json");
    if (!config) {
        config = {
            paths: [],
        }
    }
    const data = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, data, "utf8");
    return config;
}