export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
}

export interface Account {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  color: string;
  createdAt: number;
  proxy?: string;
  userAgent?: string;
  icon?: string;
}

export interface PanelState {
  accountId: string;
  url: string;
  title: string;
  favicon: string;
  isLoading: boolean;
  isMuted: boolean;
  zoom: number;
  canGoBack: boolean;
  canGoForward: boolean;
  wcId?: number;
}

export type ProxyProtocol = "http" | "https" | "socks5" | "socks4";

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username?: string;
  password?: string;
}

export function parseProxyString(raw: string): ProxyConfig | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  let protocol: ProxyProtocol = "http";
  let rest = cleaned;

  if (rest.toLowerCase().startsWith("socks5://")) {
    protocol = "socks5";
    rest = rest.slice(9);
  } else if (rest.toLowerCase().startsWith("socks4://")) {
    protocol = "socks4";
    rest = rest.slice(9);
  } else if (rest.toLowerCase().startsWith("https://")) {
    protocol = "https";
    rest = rest.slice(8);
  } else if (rest.toLowerCase().startsWith("http://")) {
    protocol = "http";
    rest = rest.slice(7);
  }

  let username: string | undefined;
  let password: string | undefined;

  if (rest.includes("@")) {
    const [auth, hostPort] = rest.split("@");
    if (auth.includes(":")) {
      [username, password] = auth.split(":");
    } else {
      username = auth;
    }
    rest = hostPort;
  }

  const parts = rest.split(":");
  if (parts.length < 2) return null;

  const host = parts[0];
  const port = parseInt(parts[1], 10);
  if (!host || isNaN(port)) return null;

  if (parts.length === 4) {
    username = decodeURIComponent(parts[2]);
    password = decodeURIComponent(parts[3]);
  } else if (parts.length === 3) {
    username = decodeURIComponent(parts[2]);
  }

  return { host, port, protocol, username, password };
}

export function proxyToString(proxy: ProxyConfig): string {
  let url = `${proxy.protocol}://`;
  if (proxy.username) {
    url += proxy.username;
    if (proxy.password) url += `:${proxy.password}`;
    url += "@";
  }
  url += `${proxy.host}:${proxy.port}`;
  return url;
}

export function proxyToElectronRule(proxy: ProxyConfig): string {
  return `${proxy.host}:${proxy.port}`;
}

export interface ThemeColors {
  bgDeep: string;
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgOverlay: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  accentDefault: string;
  accentLight: string;
  accentDark: string;
  borderDefault: string;
  borderSubtle: string;
  borderMuted: string;
  success: string;
  warning: string;
  danger: string;
  scrollbarThumb: string;
  scrollbarHover: string;
}

export interface Settings {
  launchOnStartup: boolean;
  autoUpdate: boolean;
  restoreSession: boolean;
  defaultZoom: number;
  defaultUrl: string;
  defaultLayout: "auto" | "single" | "columns" | "rows" | "free";
  downloadsDir: string;
  askDownloadDir: boolean;
  language: string;
  theme: "Escuro" | "Claro" | "Sistema";
  accentColor: string;
  sidebarCollapsed: boolean;
  shortcuts: Record<string, string>;
  currentThemeId: string;
  customThemeColors: Partial<ThemeColors>;
  performanceProfile: PerformanceProfile;
  fpsLimit: FpsLimit;
  hardwareAcceleration: boolean;
  maxPanelsMemory: number;
  lowPowerMode: boolean;
  gpuRasterization: boolean;
  smoothScrolling: boolean;
  backgroundThrottling: boolean;
  maxCacheSizeMB: number;
  autoPurgeCache: boolean;
  extensions: Extension[];
  proxies: string[];
  favoriteUrls: { url: string; title: string }[];
  history: { url: string; title: string; timestamp: number; accountId: string }[];
  autoFingerprint?: boolean;
}

export interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  manifestVersion: number;
  path: string;
  enabled: boolean;
  enabledGlobally: boolean;
  enabledAccounts: string[];
  iconUrl: string;
  installSource: "zip" | "directory" | "crx";
  installedAt: number;
}

export type PerformanceProfile = "balanced" | "eco" | "performance" | "custom";

export type FpsLimit = 0 | 30 | 60 | 120 | 144 | 165 | 240;

export const PERFORMANCE_PROFILES: Record<
  PerformanceProfile,
  {
    label: string;
    icon: string;
    description: string;
    color: string;
    fpsLimit: FpsLimit;
    hardwareAcceleration: boolean;
    maxPanelsMemory: number;
    lowPowerMode: boolean;
    gpuRasterization: boolean;
    smoothScrolling: boolean;
    backgroundThrottling: boolean;
    maxCacheSizeMB: number;
    autoPurgeCache: boolean;
  }
> = {
  balanced: {
    label: "Balanceado",
    icon: "balance",
    description: "Equilíbrio entre desempenho e consumo de recursos.",
    color: "#6366f1",
    fpsLimit: 60,
    hardwareAcceleration: true,
    maxPanelsMemory: 8,
    lowPowerMode: false,
    gpuRasterization: true,
    smoothScrolling: true,
    backgroundThrottling: true,
    maxCacheSizeMB: 256,
    autoPurgeCache: false,
  },
  eco: {
    label: "Economia de Energia",
    icon: "eco",
    description: "Reduz consumo de CPU, RAM e bateria. Ideal para Notebooks.",
    color: "#22c55e",
    fpsLimit: 30,
    hardwareAcceleration: true,
    maxPanelsMemory: 4,
    lowPowerMode: true,
    gpuRasterization: false,
    smoothScrolling: false,
    backgroundThrottling: true,
    maxCacheSizeMB: 128,
    autoPurgeCache: true,
  },
  performance: {
    label: "Desempenho",
    icon: "performance",
    description: "Máximo poder gráfico e velocidade. Usa mais recursos.",
    color: "#f59e0b",
    fpsLimit: 0,
    hardwareAcceleration: true,
    maxPanelsMemory: 16,
    lowPowerMode: false,
    gpuRasterization: true,
    smoothScrolling: true,
    backgroundThrottling: false,
    maxCacheSizeMB: 512,
    autoPurgeCache: false,
  },
  custom: {
    label: "Personalizado",
    icon: "custom",
    description: "Ajuste manual de cada parâmetro de performance.",
    color: "#a855f7",
    fpsLimit: 60,
    hardwareAcceleration: true,
    maxPanelsMemory: 8,
    lowPowerMode: false,
    gpuRasterization: true,
    smoothScrolling: true,
    backgroundThrottling: true,
    maxCacheSizeMB: 256,
    autoPurgeCache: false,
  },
};

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  path: string;
  progress: number;
  totalBytes: number;
  receivedBytes: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
  startTime: number;
}

export interface AppState {
  workspaces: Workspace[];
  accounts: Account[];
  activeWorkspaceId: string | null;
  settings: Settings;
  downloads: DownloadItem[];
}

export const DEFAULT_SETTINGS: Settings = {
  launchOnStartup: false,
  autoUpdate: true,
  restoreSession: true,
  defaultZoom: 100,
  defaultUrl: "https://www.google.com",
  defaultLayout: "auto",
  downloadsDir: "",
  askDownloadDir: true,
  language: "pt-BR",
  theme: "Escuro",
  accentColor: "#f59e0b",
  sidebarCollapsed: false,
  currentThemeId: "dark-amber",
  customThemeColors: {},
  performanceProfile: "balanced",
  fpsLimit: 60,
  hardwareAcceleration: true,
  maxPanelsMemory: 8,
  lowPowerMode: false,
  gpuRasterization: true,
  smoothScrolling: true,
  backgroundThrottling: true,
  maxCacheSizeMB: 256,
  autoPurgeCache: false,
  extensions: [],
  proxies: [],
  favoriteUrls: [],
  history: [],
  autoFingerprint: false,
  shortcuts: {
    "select-panel-1": "Ctrl+1",
    "select-panel-2": "Ctrl+2",
    "select-panel-3": "Ctrl+3",
    "select-panel-4": "Ctrl+4",
    "select-panel-5": "Ctrl+5",
    "select-panel-6": "Ctrl+6",
    "select-panel-7": "Ctrl+7",
    "select-panel-8": "Ctrl+8",
    "select-panel-9": "Ctrl+9",
    "next-panel": "Ctrl+Tab",
    "new-workspace": "Ctrl+Shift+N",
    "new-account": "Ctrl+N",
    "reload-active": "Ctrl+R",
    "reload-ignore-cache": "Ctrl+Shift+R",
    "reload-all": "Ctrl+Alt+R",
    "mute-active": "Ctrl+M",
    "mute-all": "Ctrl+Shift+M",
    "focus-address-bar": "Ctrl+L",
    "zoom-in": "Ctrl++",
    "zoom-out": "Ctrl+-",
    "fullscreen": "F11",
    "settings": "Ctrl+,",
    "help": "F1",
  },
};

export const DEFAULT_WORKSPACE: Omit<Workspace, "id" | "createdAt"> = {
  name: "Workspace 1",
  color: "#6366f1",
  icon: "layers",
};
