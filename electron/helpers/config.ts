import { app } from "electron";
import path from "node:path";
import fs from "node:fs";
import { ConfigData } from "../typings/config";

export let configData: ConfigData | null = null;

export const readConfig = (): ConfigData | null =>  {
  try {
    const configPath = path.join(app.getPath("userData"), "config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      configData = config;
      return config || null;
    } else {
      console.log('Config file not found');
      return null;
    }
  } catch (error) {
    console.error(error);
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
    configData = config;
    return config;
}