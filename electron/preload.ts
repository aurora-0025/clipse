import { ipcRenderer, contextBridge } from 'electron'
import { ConfigData } from './typings/config';

// Custom APIs for renderer
export const api = {
  // Window API's
  resize_win: (width: number, height: number) => {
    return ipcRenderer.invoke("resize_win", width, height);
  },
  // Dialog API
  select_dir: (multiple = true) => {
    return ipcRenderer.invoke("select_dir", multiple);
  },
  // Config API
  read_config: () => {
    return ipcRenderer.invoke("read_config");
  },
  write_config: (config: ConfigData) => {
    return ipcRenderer.invoke("write_config", config);
  },
  // DnD
  start_drag: (filePaths: string[]) => {
    ipcRenderer.send("start_drag", filePaths)
  },
  // Database
  index_files: (paths: string[]) => {
    return ipcRenderer.invoke("index_files", paths);
  },
  send_index_progress: (callback: (arg0: string) => void) =>
    ipcRenderer.on("index-process", (_event, message: string) => callback(message)),
  remove_index_progress_listener: () => ipcRenderer.removeAllListeners("index-process"),
  simple_search: (query: string) => {
    return ipcRenderer.invoke("simple_search", query);
  },
  vector_search: (query: string) => {
    return ipcRenderer.invoke("vector_search", query);
  },
};

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
});

contextBridge.exposeInMainWorld("api", api);
