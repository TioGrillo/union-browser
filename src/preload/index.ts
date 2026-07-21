import { contextBridge, ipcRenderer } from "electron";

const ALLOWED_INVOKE = [
  "window:is-maximized",
  "workspaces:get",
  "workspaces:create",
  "workspaces:update",
  "workspaces:delete",
  "workspaces:set-active",
  "workspaces:export",
  "workspaces:import",
  "accounts:get",
  "accounts:create",
  "accounts:update",
  "accounts:delete",
  "panels:mount",
  "panels:state",
  "panels:all-states",
  "panels:screenshot",
  "settings:get",
  "settings:set",
  "downloads:list",
  "data:get",
  "data:set",
  "updates:check",
  "system:metrics",
  "system:hwid",
  "system:keyauth-request",
  "system:choose-directory",
  "system:open-file",
  "system:save-file",
  "menu:show-layout",
  "menu:show-workspace",
  "menu:show-account",
  "menu:show-downloads",
  "performance:apply-fps",
  "performance:purge-cache",
  "performance:apply-session",
  "extensions:list",
  "extensions:install-zip",
  "extensions:install-directory",
  "extensions:remove",
  "extensions:toggle",
  "extensions:set-globally",
  "extensions:set-account",
  "extensions:load-on-session",
  "extensions:get-cws-url",
  "updates:keyauth-progress",
] as const;

const ALLOWED_SEND = [
  "window:close",
  "window:minimize",
  "window:maximize-toggle",
  "panels:unmount",
  "panels:set-visible",
  "panels:set-bounds",
  "panels:navigate",
  "panels:reload",
  "panels:stop",
  "panels:back",
  "panels:forward",
  "panels:zoom",
  "panels:mute",
  "updates:install",
  "updates:keyauth-start",
] as const;

type InvokeChannel = (typeof ALLOWED_INVOKE)[number];
type SendChannel = (typeof ALLOWED_SEND)[number];

const api = {
  invoke(channel: string, ...args: unknown[]) {
    if (!(ALLOWED_INVOKE as readonly string[]).includes(channel)) {
      return Promise.reject(new Error(`Canal não permitido: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  send(channel: string, ...args: unknown[]) {
    if (!(ALLOWED_SEND as readonly string[]).includes(channel)) {
      throw new Error(`Canal não permitido: ${channel}`);
    }
    ipcRenderer.send(channel, ...args);
  },

  on(channel: string, callback: (...args: unknown[]) => void) {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },

  once(channel: string, callback: (...args: unknown[]) => void) {
    ipcRenderer.once(channel, (_event, ...args) => callback(...args));
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

export type ElectronAPI = typeof api;
