"use strict";
const electron = require("electron");
const api = {
  // Window API's
  resize_win: (width, height) => {
    return electron.ipcRenderer.invoke("resize_win", width, height);
  },
  // Dialog API
  select_dir: (multiple = true) => {
    return electron.ipcRenderer.invoke("select_dir", multiple);
  },
  // Config API
  read_config: () => {
    return electron.ipcRenderer.invoke("read_config");
  },
  write_config: (config) => {
    return electron.ipcRenderer.invoke("write_config", config);
  },
  // Database
  index_files: (paths) => {
    return electron.ipcRenderer.invoke("index_files", paths);
  },
  send_index_progress: (callback) => electron.ipcRenderer.on("index-process", (_event, message) => callback(message)),
  remove_index_progress_listener: () => electron.ipcRenderer.removeAllListeners("index-process"),
  simple_search: (query) => {
    return electron.ipcRenderer.invoke("simple_search", query);
  }
};
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("api", api);
