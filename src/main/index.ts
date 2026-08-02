import {
  app,
  BrowserWindow,
  ipcMain,
  WebContentsView,
  session,
  nativeImage,
  desktopCapturer,
  dialog,
  net,
  Menu,
  MenuItemConstructorOptions,
  webContents,
  shell,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import Store from "electron-store";
import crypto from "node:crypto";
import os from "node:os";
import extractZip from "extract-zip";
import {
  Workspace,
  Account,
  PanelState,
  Settings,
  Extension,
  DownloadItem,
  AppState,
  DEFAULT_SETTINGS,
  DEFAULT_WORKSPACE,
} from "../types";

let mainWindow: BrowserWindow | null = null;
let panelViews: Map<string, WebContentsView> = new Map();
let panelStates: Map<string, PanelState> = new Map();

const store = new Store<AppState>({
  defaults: {
    workspaces: [],
    accounts: [],
    activeWorkspaceId: null,
    settings: DEFAULT_SETTINGS,
    downloads: [],
  },
});

function generateId(): string {
  return crypto.randomUUID();
}

function getSettings(): Settings {
  const stored = store.get("settings", DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    extensions: stored.extensions || [],
  };
}

function sendToRenderer(channel: string, ...args: unknown[]) {
  mainWindow?.webContents.send(channel, ...args);
}

function applyFpsToAllWebviews(fps: number) {
  const allWebContents = webContents.getAllWebContents();
  for (const wc of allWebContents) {
    try {
      if (wc.id !== mainWindow?.webContents.id) {
        wc.setFrameRate(fps === 0 ? 60 : fps);
      }
    } catch {}
  }
}

function applyCacheLimits(maxSizeMB: number) {
  // Cache size limit is applied per-session via Chromium defaults
  // We track it in settings and enforce via periodic purge if autoPurgeCache is on
}

function purgeAllPanelCaches() {
  const accounts = store.get("accounts", []);
  for (const acc of accounts) {
    try {
      const ses = session.fromPartition("persist:panel-" + acc.id, { cache: true });
      ses.clearCache().catch(() => {});
    } catch {}
  }
}

const EXTENSIONS_DIR = path.join(app.getPath("userData"), "extensions");

function ensureExtensionsDir() {
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });
  }
}

function generateExtensionId(manifest: any): string {
  return manifest.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40) + "-" + crypto.randomUUID().slice(0, 8);
}

async function installExtensionFromZip(
  zipPath: string,
  existingExtensions: Extension[]
): Promise<Extension | null> {
  ensureExtensionsDir();
  const tempDir = path.join(EXTENSIONS_DIR, "temp-" + Date.now());

  try {
    await extractZip(zipPath, { dir: tempDir });

    // Find manifest.json in extracted contents (could be nested)
    const manifestPath = findManifest(tempDir);
    if (!manifestPath) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return null;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const extDir = path.dirname(manifestPath);
    const extId = generateExtensionId(manifest);

    // Check if already installed
    const existing = existingExtensions.find(
      (e) => e.name === manifest.name && e.version === manifest.version
    );
    if (existing) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      return null;
    }

    // Move to final location
    const finalDir = path.join(EXTENSIONS_DIR, extId);
    if (fs.existsSync(finalDir)) {
      fs.rmSync(finalDir, { recursive: true, force: true });
    }
    fs.renameSync(extDir, finalDir);
    fs.rmSync(tempDir, { recursive: true, force: true });

    const iconUrl = manifest.icons
      ? manifest.icons["128"] || manifest.icons["48"] || manifest.icons["16"]
      : "";

    return {
      id: extId,
      name: manifest.name || "Unknown Extension",
      version: manifest.version || "0.0.0",
      description: manifest.description || "",
      manifestVersion: manifest.manifest_version || 3,
      path: finalDir,
      enabled: true,
      enabledGlobally: false,
      enabledAccounts: [],
      iconUrl: iconUrl ? path.join(finalDir, iconUrl) : "",
      installSource: "zip",
      installedAt: Date.now(),
    };
  } catch (e) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw e;
  }
}

async function installExtensionFromDirectory(
  dirPath: string,
  existingExtensions: Extension[]
): Promise<Extension | null> {
  ensureExtensionsDir();

  const manifestPath = findManifest(dirPath);
  if (!manifestPath) return null;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const extId = generateExtensionId(manifest);

  // Check duplicate
  const existing = existingExtensions.find(
    (e) => e.name === manifest.name && e.version === manifest.version
  );
  if (existing) return null;

  // Copy to extensions dir
  const finalDir = path.join(EXTENSIONS_DIR, extId);
  fs.cpSync(dirPath, finalDir, { recursive: true });

  const iconUrl = manifest.icons
    ? manifest.icons["128"] || manifest.icons["48"] || manifest.icons["16"]
    : "";

  return {
    id: extId,
    name: manifest.name || "Unknown Extension",
    version: manifest.version || "0.0.0",
    description: manifest.description || "",
    manifestVersion: manifest.manifest_version || 3,
    path: finalDir,
    enabled: true,
    enabledGlobally: false,
    enabledAccounts: [],
    iconUrl: iconUrl ? path.join(finalDir, iconUrl) : "",
    installSource: "directory",
    installedAt: Date.now(),
  };
}

function findManifest(dir: string): string | null {
  const direct = path.join(dir, "manifest.json");
  if (fs.existsSync(direct)) return direct;

  // Check one level deep (common when zip has a root folder)
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nested = path.join(dir, entry.name, "manifest.json");
      if (fs.existsSync(nested)) return nested;
    }
  }
  return null;
}

function loadExtensionsOnSession(ses: Electron.Session, settings: Settings) {
  for (const ext of settings.extensions) {
    if (ext.enabled && ext.enabledGlobally) {
      ses.loadExtension(ext.path).catch(() => {});
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: true,
    },
  });

  if (process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
    // mainWindow?.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on("maximize", () => {
    sendToRenderer("window:maximized-changed", true);
  });

  mainWindow.on("unmaximize", () => {
    sendToRenderer("window:maximized-changed", false);
  });

  mainWindow.on("closed", () => {
    panelViews.forEach((view) => {
      try { view.webContents.close(); } catch {}
    });
    panelViews.clear();
    panelStates.clear();
    mainWindow = null;
  });
}

function registerIpcHandlers(): void {
  // ── Window Controls ──────────────────────────
  ipcMain.on("window:close", () => mainWindow?.close());
  ipcMain.on("window:minimize", () => mainWindow?.minimize());
  ipcMain.on("window:maximize-toggle", () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

  // ── Workspaces ──────────────────────────────
  ipcMain.handle("workspaces:get", () => {
    return store.get("workspaces", []);
  });

  ipcMain.handle("workspaces:create", (_, data: Omit<Workspace, "id" | "createdAt">) => {
    const workspaces = store.get("workspaces", []);
    const ws: Workspace = {
      ...DEFAULT_WORKSPACE,
      ...data,
      id: generateId(),
      createdAt: Date.now(),
    };
    workspaces.push(ws);
    store.set("workspaces", workspaces);
    if (!store.get("activeWorkspaceId")) {
      store.set("activeWorkspaceId", ws.id);
    }
    return ws;
  });

  ipcMain.handle("workspaces:update", (_, id: string, data: Partial<Workspace>) => {
    const workspaces = store.get("workspaces", []);
    const idx = workspaces.findIndex((w) => w.id === id);
    if (idx !== -1) {
      workspaces[idx] = { ...workspaces[idx], ...data };
      store.set("workspaces", workspaces);
      return workspaces[idx];
    }
    return null;
  });

  ipcMain.handle("workspaces:delete", (_, id: string) => {
    let workspaces = store.get("workspaces", []);
    workspaces = workspaces.filter((w) => w.id !== id);
    store.set("workspaces", workspaces);

    let accounts = store.get("accounts", []);
    const accountIds = accounts.filter((a) => a.workspaceId === id).map((a) => a.id);
    accounts = accounts.filter((a) => a.workspaceId !== id);
    store.set("accounts", accounts);

    accountIds.forEach((aid) => {
      const view = panelViews.get(aid);
      if (view) {
        try { view.webContents.close(); } catch {}
        panelViews.delete(aid);
        panelStates.delete(aid);
      }
    });

    if (store.get("activeWorkspaceId") === id) {
      store.set("activeWorkspaceId", workspaces[0]?.id ?? null);
    }
    return true;
  });

  ipcMain.handle("workspaces:set-active", (_, id: string) => {
    store.set("activeWorkspaceId", id);
    return true;
  });

  // ── Accounts ────────────────────────────────
  ipcMain.handle("accounts:get", (_, workspaceId?: string) => {
    const accounts = store.get("accounts", []);
    if (workspaceId) return accounts.filter((a) => a.workspaceId === workspaceId);
    return accounts;
  });

  ipcMain.handle("accounts:create", (_, data: Omit<Account, "id" | "createdAt">) => {
    const accounts = store.get("accounts", []);
    const account: Account = {
      id: generateId(),
      createdAt: Date.now(),
      ...data,
    };
    accounts.push(account);
    store.set("accounts", accounts);
    return account;
  });

  ipcMain.handle("accounts:update", (_, id: string, data: Partial<Account>) => {
    const accounts = store.get("accounts", []);
    const idx = accounts.findIndex((a) => a.id === id);
    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], ...data };
      store.set("accounts", accounts);
      return accounts[idx];
    }
    return null;
  });

  ipcMain.handle("accounts:delete", (_, id: string) => {
    let accounts = store.get("accounts", []);
    accounts = accounts.filter((a) => a.id !== id);
    store.set("accounts", accounts);

    const view = panelViews.get(id);
    if (view) {
      try { view.webContents.close(); } catch {}
      panelViews.delete(id);
      panelStates.delete(id);
    }
    return true;
  });

  ipcMain.handle("menu:show-downloads", (event) => {
    return new Promise((resolve) => {
      const template = [
        { label: "DOWNLOADS", enabled: false },
        { type: "separator" as const },
        { label: "Nenhum download nesta sessão", enabled: false },
      ];
      const menu = Menu.buildFromTemplate(template);
      menu.once('menu-will-close', () => setTimeout(() => resolve(null), 100));
      menu.popup({ window: mainWindow ?? undefined });
    });
  });

  // ── Panel Management ────────────────────────
  ipcMain.handle("panels:mount", async (_, accountId, url) => {
    const acc = store.get("accounts", []).find((a) => a.id === accountId);
    if (!acc) return false;

    const partition = "persist:panel-" + accountId;
    const ses = session.fromPartition(partition, { cache: true });

    if (acc.proxy) {
      try {
        const proxyUrl = acc.proxy;
        await ses.setProxy({
          mode: "fixed_servers",
          proxyRules: proxyUrl,
        });
      } catch (e) {
        console.error(`Failed to set proxy for ${accountId}:`, e);
      }
    }

    // Load extensions enabled for this account or globally
    const settings = getSettings();
    for (const ext of settings.extensions) {
      if (!ext.enabled) continue;
      if (ext.enabledGlobally || ext.enabledAccounts.includes(accountId)) {
        ses.loadExtension(ext.path).catch(() => {});
      }
    }

    return true;
  });

  ipcMain.handle("panels:set-proxy", async (_, accountId: string, proxy: string | null) => {
    const accounts = store.get("accounts", []);
    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) return false;

    accounts[idx].proxy = proxy || undefined;
    store.set("accounts", accounts);

    const partition = "persist:panel-" + accountId;
    const ses = session.fromPartition(partition, { cache: true });
    try {
      if (proxy) {
        await ses.setProxy({ mode: "fixed_servers", proxyRules: proxy });
      } else {
        await ses.setProxy({ mode: "direct" });
      }
    } catch (e) {
      console.error(`Failed to set proxy for ${accountId}:`, e);
    }

    return true;
  });

  ipcMain.handle("panels:set-proxy-workspace", async (_, workspaceId: string, proxy: string | null) => {
    const accounts = store.get("accounts", []);
    const workspaceAccounts = accounts.filter((a) => a.workspaceId === workspaceId);

    for (const acc of workspaceAccounts) {
      acc.proxy = proxy || undefined;
      const partition = "persist:panel-" + acc.id;
      const ses = session.fromPartition(partition, { cache: true });
      try {
        if (proxy) {
          await ses.setProxy({ mode: "fixed_servers", proxyRules: proxy });
        } else {
          await ses.setProxy({ mode: "direct" });
        }
      } catch (e) {
        console.error(`Failed to set proxy for ${acc.id}:`, e);
      }
    }

    store.set("accounts", accounts);
    return true;
  });

  ipcMain.handle("session:clear-data", async (_, accountId: string) => {
    const partition = "persist:panel-" + accountId;
    try {
      const ses = session.fromPartition(partition, { cache: true });
      await ses.clearStorageData();
      await ses.clearCache();
      await ses.clearAuthCache();
      return true;
    } catch (e) {
      console.error(`Failed to clear session for ${accountId}:`, e);
      return false;
    }
  });

  // ── Settings ────────────────────────────────
  ipcMain.handle("settings:get", () => {
    return getSettings();
  });

  ipcMain.handle("settings:set", (_, data: Partial<Settings>) => {
    const current = getSettings();
    const updated = { ...current, ...data };
    
    // Apply system level settings
    if (data.launchOnStartup !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: data.launchOnStartup,
        path: app.getPath("exe"),
      });
    }

    // Auto-apply performance when settings change
    if (data.fpsLimit !== undefined) {
      applyFpsToAllWebviews(data.fpsLimit);
    }
    if (data.maxCacheSizeMB !== undefined) {
      applyCacheLimits(data.maxCacheSizeMB);
    }
    if (data.autoPurgeCache) {
      purgeAllPanelCaches();
    }

    store.set("settings", updated);
    sendToRenderer("settings:changed", updated);
    return updated;
  });

  // ── Performance ──────────────────────────────
  ipcMain.handle("performance:apply-fps", (_, fps: number) => {
    applyFpsToAllWebviews(fps);
  });

  ipcMain.handle("performance:purge-cache", (_, partition?: string) => {
    if (partition) {
      const ses = session.fromPartition(partition, { cache: true });
      ses.clearCache().catch(() => {});
    } else {
      purgeAllPanelCaches();
    }
  });

  ipcMain.handle("performance:apply-session", (_, settings: { maxCacheSizeMB?: number }) => {
    if (settings.maxCacheSizeMB !== undefined) {
      applyCacheLimits(settings.maxCacheSizeMB);
    }
  });

  // ── Extensions ───────────────────────────────
  ipcMain.handle("extensions:list", () => {
    return getSettings().extensions || [];
  });

  ipcMain.handle("extensions:install-zip", async () => {
    if (!mainWindow) return null;
    const result = (await dialog.showOpenDialog(mainWindow, {
      title: "Selecionar extensão (.zip)",
      filters: [{ name: "Extensão Chrome", extensions: ["zip"] }],
      properties: ["openFile", "multiSelections"],
    })) as any;
    if (result.canceled || !result.filePaths.length) return null;

    const settings = getSettings();
    const installed: Extension[] = [];

    for (const zipPath of result.filePaths) {
      try {
        const ext = await installExtensionFromZip(zipPath, settings.extensions);
        if (ext) {
          settings.extensions.push(ext);
          installed.push(ext);
        }
      } catch (e) {
        console.error("Failed to install extension from zip:", e);
      }
    }

    store.set("settings", settings);
    sendToRenderer("settings:changed", settings);
    return installed;
  });

  ipcMain.handle("extensions:install-directory", async () => {
    if (!mainWindow) return null;
    const result = (await dialog.showOpenDialog(mainWindow, {
      title: "Selecionar pasta da extensão",
      properties: ["openDirectory"],
    })) as any;
    if (result.canceled || !result.filePaths.length) return null;

    const settings = getSettings();
    const dirPath = result.filePaths[0];

    try {
      const ext = await installExtensionFromDirectory(dirPath, settings.extensions);
      if (ext) {
        settings.extensions.push(ext);
        store.set("settings", settings);
        sendToRenderer("settings:changed", settings);
        return ext;
      }
    } catch (e) {
      console.error("Failed to install extension from directory:", e);
    }
    return null;
  });

  ipcMain.handle("extensions:remove", (_, extensionId: string) => {
    const settings = getSettings();
    const ext = settings.extensions.find((e) => e.id === extensionId);
    if (!ext) return false;

    // Unload from all sessions
    const accounts = store.get("accounts", []);
    for (const acc of accounts) {
      try {
        const ses = session.fromPartition("persist:panel-" + acc.id, { cache: true });
        ses.removeExtension(extensionId);
      } catch {}
    }

    // Remove directory
    try {
      if (fs.existsSync(ext.path)) {
        fs.rmSync(ext.path, { recursive: true, force: true });
      }
    } catch {}

    settings.extensions = settings.extensions.filter((e) => e.id !== extensionId);
    store.set("settings", settings);
    sendToRenderer("settings:changed", settings);
    return true;
  });

  ipcMain.handle("extensions:toggle", (_, extensionId: string, enabled: boolean) => {
    const settings = getSettings();
    const ext = settings.extensions.find((e) => e.id === extensionId);
    if (!ext) return false;
    ext.enabled = enabled;
    store.set("settings", settings);
    sendToRenderer("settings:changed", settings);
    return true;
  });

  ipcMain.handle("extensions:set-globally", (_, extensionId: string, enabledGlobally: boolean) => {
    const settings = getSettings();
    const ext = settings.extensions.find((e) => e.id === extensionId);
    if (!ext) return false;
    ext.enabledGlobally = enabledGlobally;
    store.set("settings", settings);
    sendToRenderer("settings:changed", settings);
    return true;
  });

  ipcMain.handle("extensions:set-account", (_, extensionId: string, accountId: string, enabled: boolean) => {
    const settings = getSettings();
    const ext = settings.extensions.find((e) => e.id === extensionId);
    if (!ext) return false;
    if (enabled) {
      if (!ext.enabledAccounts.includes(accountId)) {
        ext.enabledAccounts.push(accountId);
      }
    } else {
      ext.enabledAccounts = ext.enabledAccounts.filter((id) => id !== accountId);
    }
    store.set("settings", settings);
    sendToRenderer("settings:changed", settings);
    return true;
  });

  ipcMain.handle("extensions:load-on-session", (_, extensionId: string, partition: string) => {
    const settings = getSettings();
    const ext = settings.extensions.find((e) => e.id === extensionId);
    if (!ext || !ext.enabled) return false;

    try {
      const ses = session.fromPartition(partition, { cache: true });
      ses.loadExtension(ext.path).catch(() => {});
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("extensions:get-cws-url", (_, extensionId: string) => {
    return `https://chromewebstore.google.com/detail/${extensionId}`;
  });

  // ── Downloads ───────────────────────────────
  ipcMain.handle("downloads:list", () => {
    return store.get("downloads", []);
  });

  // ── Data persistence (generic) ──────────────
  ipcMain.handle("data:get", (_, key: string) => {
    return store.get(key as keyof AppState);
  });

  ipcMain.handle("data:set", (_, key: string, value: unknown) => {
    store.set(key as keyof AppState, value as never);
    return true;
  });

  // ── Updates via KeyAuth ─────────────────────────────────
  ipcMain.on("updates:keyauth-start", async (e, url: string) => {
    let dest: fs.WriteStream | null = null;
    try {
      sendToRenderer("updates:keyauth-progress", "Preparando download...", 0);
      const res = await net.fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const contentLength = Number(res.headers.get("content-length")) || 0;
      const destPath = path.join(app.getPath("temp"), `Update-UnionBrowser-${Date.now()}.exe`);
      dest = fs.createWriteStream(destPath);
      
      let downloaded = 0;
      let lastEmit = Date.now();

      if (res.body) {
        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            downloaded += value.length;
            dest.write(value);
            
            const now = Date.now();
            if (now - lastEmit > 50) { // throttle to 20 fps
              lastEmit = now;
              if (contentLength > 0) {
                const percent = (downloaded / contentLength) * 100;
                sendToRenderer("updates:keyauth-progress", "Baixando atualização...", percent);
              } else {
                const mb = (downloaded / (1024 * 1024)).toFixed(1);
                sendToRenderer("updates:keyauth-progress", `Baixando atualização... (${mb}MB)`, 100);
              }
            }
          }
        }
        dest.end();
      } else {
        throw new Error("Empty body");
      }
      
      sendToRenderer("updates:keyauth-progress", "Concluído! Reiniciando...", 100);
      
      setTimeout(() => {
        shell.openPath(destPath);
        setTimeout(() => app.quit(), 1000);
      }, 1000);
      
    } catch (err: any) {
      if (dest) {
        dest.close();
      }
      sendToRenderer("updates:keyauth-progress", "Erro no download: " + err.message, 0);
    }
  });

  // ── Screenshot ──────────────────────────────
  ipcMain.handle("panels:screenshot", async (_, accountId: string) => {
    const view = panelViews.get(accountId);
    if (!view) return null;
    try {
      const image = await view.webContents.capturePage();
      return image.toDataURL();
    } catch {
      return null;
    }
  });

  // ── Metrics ─────────────────────────────────
  ipcMain.handle("system:metrics", () => {
    const metrics = app.getAppMetrics();
    let totalCpu = 0;
    let totalRam = 0;
    
    metrics.forEach((m) => {
      totalCpu += m.cpu.percentCPUUsage;
      totalRam += m.memory.workingSetSize;
    });

    const wcMetrics: Record<number, { cpu: number; ram: number }> = {};
    const allWc = webContents.getAllWebContents();
    
    allWc.forEach((wc) => {
      try {
        const procId = wc.getOSProcessId();
        const pMetrics = metrics.find(m => m.pid === procId);
        if (pMetrics) {
          wcMetrics[wc.id] = {
            cpu: Number(pMetrics.cpu.percentCPUUsage.toFixed(1)),
            ram: Math.round(pMetrics.memory.workingSetSize / 1024),
          };
        }
      } catch {}
    });

    return {
      totalCpu: Number(totalCpu.toFixed(1)),
      totalRam: Math.round(totalRam / 1024),
      wcMetrics,
    };
  });

  // ── System Dialogs ──────────────────────────
  ipcMain.handle("system:hwid", () => {
    // Generate a simple HWID based on system info
    const data = [
      os.hostname(),
      os.type(),
      os.arch(),
      os.release(),
      os.totalmem().toString(),
      os.cpus().map(c => c.model).join("")
    ].join("|");
    
    return crypto.createHash("sha256").update(data).digest("hex");
  });

  ipcMain.handle("system:keyauth-request", async (_, url: string) => {
    try {
      const res = await net.fetch(url, {
        headers: {
          "User-Agent": "KeyAuth-Electron-App"
        }
      });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return { success: false, message: "Resposta inválida do servidor: " + text.slice(0, 50) };
      }
    } catch (e) {
      return { success: false, message: "Erro de conexão (Main Process)." };
    }
  });

  ipcMain.handle("system:choose-directory", async () => {
    if (!mainWindow) return null;
    const result = (await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"]
    })) as any;
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("menu:show-layout", (event, currentLayout: string) => {
    return new Promise((resolve) => {
      const template: MenuItemConstructorOptions[] = [
        { label: "Grade automática", type: "checkbox", checked: currentLayout === "auto", click: () => resolve("auto") },
        { label: "Painel único", type: "checkbox", checked: currentLayout === "single", click: () => resolve("single") },
        { label: "Colunas", type: "checkbox", checked: currentLayout === "columns", click: () => resolve("columns") },
        { label: "Linhas", type: "checkbox", checked: currentLayout === "rows", click: () => resolve("rows") },
        { label: "Livre", type: "checkbox", checked: currentLayout === "free", click: () => resolve("free") },
      ];
      const menu = Menu.buildFromTemplate(template);
      menu.once('menu-will-close', () => setTimeout(() => resolve(null), 100));
      menu.popup({ window: mainWindow ?? undefined });
    });
  });

  ipcMain.handle("menu:show-workspace", (event) => {
    return new Promise((resolve) => {
      const template: MenuItemConstructorOptions[] = [
        { label: "Editar Workspace", click: () => resolve("edit") },
        { label: "Duplicar Workspace", click: () => resolve("duplicate") },
        { type: "separator" },
        { label: "Excluir Workspace", click: () => resolve("delete") },
      ];
      const menu = Menu.buildFromTemplate(template);
      menu.once('menu-will-close', () => setTimeout(() => resolve(null), 100));
      menu.popup({ window: mainWindow ?? undefined });
    });
  });

  ipcMain.handle("menu:show-account", (event) => {
    return new Promise((resolve) => {
      const template: MenuItemConstructorOptions[] = [
        { label: "Recarregar", click: () => resolve("reload") },
        { label: "Ir para a URL padrão", click: () => resolve("home") },
        { label: "Silenciar painel", click: () => resolve("mute") },
        { label: "Fechar conta", click: () => resolve("close") },
        { type: "separator" },
        { label: "Editar conta", click: () => resolve("edit") },
        { label: "Duplicar conta", click: () => resolve("duplicate") },
        { type: "separator" },
        { label: "Limpar dados da sessão", click: () => resolve("clear") },
        { label: "Excluir conta", click: () => resolve("delete") },
      ];
      const menu = Menu.buildFromTemplate(template);
      menu.once('menu-will-close', () => setTimeout(() => resolve(null), 100));
      menu.popup({ window: mainWindow ?? undefined });
    });
  });

  ipcMain.handle("system:open-file", async (_, filters: Electron.FileFilter[]) => {
    if (!mainWindow) return null;
    const result = (await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters
    })) as any;
    if (result.canceled || result.filePaths.length === 0) return null;
    try {
      return fs.readFileSync(result.filePaths[0], "utf-8");
    } catch {
      return null;
    }
  });

  ipcMain.handle("system:save-file", async (_, defaultPath: string, content: string) => {
    if (!mainWindow) return false;
    const result = (await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [{ name: "JSON", extensions: ["json"] }]
    })) as any;
    if (result.canceled || !result.filePath) return false;
    try {
      fs.writeFileSync(result.filePath, content, "utf-8");
      return true;
    } catch {
      return false;
    }
  });

  // ── Export / Import ─────────────────────────
  ipcMain.handle("workspaces:export", () => {
    return {
      workspaces: store.get("workspaces", []),
      accounts: store.get("accounts", []),
      exportedAt: Date.now(),
    };
  });

  ipcMain.handle("workspaces:import", (_, data: { workspaces: Workspace[]; accounts: Account[] }) => {
    if (!data?.workspaces || !data?.accounts) return false;
    store.set("workspaces", data.workspaces);
    store.set("accounts", data.accounts);
    if (data.workspaces.length > 0) {
      store.set("activeWorkspaceId", data.workspaces[0].id);
    }
    return true;
  });
}

// ── Otimizações de Consumo (Modo Ultra Leve) ───────────
app.commandLine.appendSwitch("disable-features", "Translate,OptimizationHints,MediaRouter");
app.commandLine.appendSwitch("enable-zero-copy"); // Reduce RAM copy overhead
app.commandLine.appendSwitch("enable-gpu-rasterization"); // Offload to GPU
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("disable-renderer-backgrounding", "false");
app.commandLine.appendSwitch("enable-background-thread-pool", "false");
app.commandLine.appendSwitch("enable-quic");
// Limite agressivo de memória V8 (reduz pico de memória em webviews)
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=256 --lite-mode");

// ── App Lifecycle ────────────────────────────
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  // Segurança: Impedir DevTools em produção
  if (app.isPackaged) {
    app.on("browser-window-created", (event, win) => {
      win.webContents.on("devtools-opened", () => {
        win.webContents.closeDevTools();
      });
    });
  }

  const currentSettings = getSettings();
  if (currentSettings.launchOnStartup) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath("exe"),
    });
  }

  session.defaultSession.on("will-download", (event, item) => {
    const settings = getSettings();
    if (!settings.askDownloadDir && settings.downloadsDir) {
      item.setSavePath(path.join(settings.downloadsDir, item.getFilename()));
    }
  });

  // Apply stored performance settings on startup
  const perfSettings = getSettings();
  applyCacheLimits(perfSettings.maxCacheSizeMB || 256);
  if (perfSettings.autoPurgeCache) {
    purgeAllPanelCaches();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  panelViews.forEach((view) => {
    try { view.webContents.close(); } catch {}
  });
  panelViews.clear();
});

