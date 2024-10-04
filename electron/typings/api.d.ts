/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "../preload";
type PreloadApiType = typeof api;

type WindowApiType = {
  [K in keyof PreloadApiType]: (...args: Parameters<PreloadApiType[K]>) => Promise<any> | any;
};

export type IpcMainAPIEntry = {
  channel: keyof PreloadApiType;
  action: IPCMainActionType;
  listener: (event: Electron.IpcMainInvokeEvent, ...args: any) => any | Promise<any>;
};

type IPCMainActionType = "handle" | "handleOnce" | "on";
