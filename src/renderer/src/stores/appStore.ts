import { create } from "zustand";
import { Workspace, Account, PanelState, Settings, DEFAULT_SETTINGS } from "@/types/index";
import { invoke, send } from "@/lib/ipc";

interface AppStore {
  workspaces: Workspace[];
  accounts: Account[];
  activeWorkspaceId: string | null;
  settings: Settings;
  panelStates: Record<string, PanelState>;
  activeAccountId: string | null;
  sidebarCollapsed: boolean;
  isOverlayOpen: boolean;
  gridLayout: "auto" | "single" | "columns" | "rows" | "free";
  maximizedId: string | null;
  selectedAccountIds: string[];

  loadAll: () => Promise<void>;
  createWorkspace: (data: Omit<Workspace, "id" | "createdAt">) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;

  createAccount: (data: Omit<Account, "id" | "createdAt">) => Promise<Account>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  mountPanel: (accountId: string, url: string) => Promise<void>;
  unmountPanel: (accountId: string) => Promise<void>;
  navigatePanel: (accountId: string, url: string) => void;
  setPanelVisible: (accountId: string, visible: boolean, bounds: { x: number; y: number; width: number; height: number }) => void;
  setPanelBounds: (accountId: string, bounds: { x: number; y: number; width: number; height: number }) => void;
  updatePanelState: (accountId: string, state: Partial<PanelState>) => void;
  setActiveAccountId: (id: string | null) => void;
  setSelectedAccountIds: (ids: string[]) => void;

  updateSettings: (data: Partial<Settings>) => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsOverlayOpen: (isOpen: boolean) => void;
  swapAccounts: (id1: string, id2: string) => void;
  setGridLayout: (layout: "auto" | "single" | "columns" | "rows" | "free") => void;
  setMaximizedId: (id: string | null) => void;

  getActiveWorkspace: () => Workspace | undefined;
  getWorkspaceAccounts: (workspaceId: string) => Account[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  workspaces: [],
  accounts: [],
  activeWorkspaceId: null,
  settings: DEFAULT_SETTINGS,
  panelStates: {},
  activeAccountId: null,
  sidebarCollapsed: false,
  isOverlayOpen: false,
  gridLayout: "auto",
  maximizedId: null,
  selectedAccountIds: [],

  loadAll: async () => {
    const [workspaces, accounts, settings] = await Promise.all([
      invoke<Workspace[]>("workspaces:get"),
      invoke<Account[]>("accounts:get"),
      invoke<Settings>("settings:get"),
    ]);
    const activeWorkspaceId = workspaces[0]?.id ?? null;
    set({ workspaces, accounts, settings, activeWorkspaceId, sidebarCollapsed: settings.sidebarCollapsed });
  },

  createWorkspace: async (data) => {
    const ws = await invoke<Workspace>("workspaces:create", data);
    set((s) => ({ workspaces: [...s.workspaces, ws], activeWorkspaceId: s.activeWorkspaceId ?? ws.id }));
    return ws;
  },

  updateWorkspace: async (id, data) => {
    await invoke("workspaces:update", id, data);
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...data } : w)),
    }));
  },

  deleteWorkspace: async (id) => {
    await invoke("workspaces:delete", id);
    set((s) => {
      const workspaces = s.workspaces.filter((w) => w.id !== id);
      const accounts = s.accounts.filter((a) => a.workspaceId !== id);
      return {
        workspaces,
        accounts,
        activeWorkspaceId: workspaces[0]?.id ?? null,
      };
    });
  },

  setActiveWorkspace: async (id) => {
    await invoke("workspaces:set-active", id);
    set({ activeWorkspaceId: id, activeAccountId: null });
  },

  createAccount: async (data) => {
    const state = get();
    let accountData = { ...data };
    
    if (state.settings.autoFingerprint && !accountData.userAgent) {
      const agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
      ];
      accountData.userAgent = agents[Math.floor(Math.random() * agents.length)];
    }

    const account = await invoke<Account>("accounts:create", accountData);
    set((s) => ({ accounts: [...s.accounts, account] }));
    return account;
  },

  updateAccount: async (id, data) => {
    await invoke("accounts:update", id, data);
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)),
    }));
  },

  deleteAccount: async (id) => {
    await invoke("accounts:delete", id);
    set((s) => {
      const { [id]: _, ...rest } = s.panelStates;
      return {
        accounts: s.accounts.filter((a) => a.id !== id),
        panelStates: rest,
        activeAccountId: s.activeAccountId === id ? null : s.activeAccountId,
      };
    });
  },

  mountPanel: async (accountId, url) => {
    await invoke("panels:mount", accountId, url);
    set((s) => ({
      panelStates: {
        ...s.panelStates,
        [accountId]: {
          accountId,
          url,
          title: "",
          favicon: "",
          isLoading: true,
          isMuted: false,
          zoom: 100,
          canGoBack: false,
          canGoForward: false,
        },
      },
    }));
  },

  unmountPanel: async (accountId) => {
    window.dispatchEvent(new CustomEvent(`panel:unmount:${accountId}`));
    set((s) => {
      const newPanelStates = { ...s.panelStates };
      delete newPanelStates[accountId];
      return { panelStates: newPanelStates };
    });
  },

  navigatePanel: (accountId, url) => {
    let formattedUrl = url;
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }
    window.dispatchEvent(new CustomEvent(`panel:navigate:${accountId}`, { detail: { url: formattedUrl } }));
    set((s) => ({
      panelStates: {
        ...s.panelStates,
        [accountId]: { ...s.panelStates[accountId], url } as PanelState,
      },
    }));
  },

  setPanelVisible: (accountId, visible, bounds) => {
    send("panels:set-visible", accountId, visible, bounds);
  },

  setPanelBounds: (accountId, bounds) => {
    send("panels:set-bounds", accountId, bounds);
  },

  updatePanelState: (accountId, state) => {
    set((s) => ({
      panelStates: {
        ...s.panelStates,
        [accountId]: { ...(s.panelStates[accountId] as PanelState), ...state },
      },
    }));
  },

  setActiveAccountId: (id) => set({ activeAccountId: id }),
  setSelectedAccountIds: (ids) => set({ selectedAccountIds: ids }),

  updateSettings: async (data) => {
    const updated = await invoke<Settings>("settings:set", data);
    set({ settings: updated });
  },

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setIsOverlayOpen: (isOpen) => set({ isOverlayOpen: isOpen }),
  setGridLayout: (layout) => set({ gridLayout: layout }),
  setMaximizedId: (id) => set({ maximizedId: id }),
  swapAccounts: (id1, id2) => {
    set((s) => {
      const idx1 = s.accounts.findIndex((a) => a.id === id1);
      const idx2 = s.accounts.findIndex((a) => a.id === id2);
      if (idx1 !== -1 && idx2 !== -1) {
        const next = [...s.accounts];
        const temp = next[idx1];
        next[idx1] = next[idx2];
        next[idx2] = temp;
        // Salvar no backend
        invoke("data:set", "accounts", next).catch(() => {});
        return { accounts: next };
      }
      return s;
    });
  },

  getActiveWorkspace: () => {
    const s = get();
    return s.workspaces.find((w) => w.id === s.activeWorkspaceId);
  },

  getWorkspaceAccounts: (workspaceId) => {
    return get().accounts.filter((a) => a.workspaceId === workspaceId);
  },
}));
