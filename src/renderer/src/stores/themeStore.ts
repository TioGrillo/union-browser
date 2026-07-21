import { create } from "zustand";
import {
  Theme,
  ThemeColors,
  THEME_PRESETS,
  getThemeById,
  mergeWithCustomColors,
} from "@/lib/themes";
import { invoke } from "@/lib/ipc";

interface ThemeState {
  currentThemeId: string;
  customColors: Partial<ThemeColors>;
  resolvedTheme: Theme;
  presets: Theme[];

  setTheme: (id: string) => Promise<void>;
  setCustomColor: (key: keyof ThemeColors, value: string) => Promise<void>;
  resetCustomColors: () => Promise<void>;
  loadFromStore: () => Promise<void>;
}

function resolveTheme(id: string, customColors: Partial<ThemeColors>): Theme {
  const base = getThemeById(id);
  if (Object.keys(customColors).length === 0) return base;
  return mergeWithCustomColors(base, customColors);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentThemeId: "dark-amber",
  customColors: {},
  resolvedTheme: getThemeById("dark-amber"),
  presets: THEME_PRESETS,

  setTheme: async (id: string) => {
    const { customColors } = get();
    const resolved = resolveTheme(id, customColors);
    set({ currentThemeId: id, resolvedTheme: resolved });
    await invoke("settings:set", {
      currentThemeId: id,
    }).catch(() => {});
  },

  setCustomColor: async (key: keyof ThemeColors, value: string) => {
    const { currentThemeId, customColors } = get();
    const next = { ...customColors, [key]: value };
    const resolved = resolveTheme(currentThemeId, next);
    set({ customColors: next, resolvedTheme: resolved });
    await invoke("settings:set", {
      customThemeColors: next,
    }).catch(() => {});
  },

  resetCustomColors: async () => {
    const { currentThemeId } = get();
    const resolved = resolveTheme(currentThemeId, {});
    set({ customColors: {}, resolvedTheme: resolved });
    await invoke("settings:set", {
      customThemeColors: {},
    }).catch(() => {});
  },

  loadFromStore: async () => {
    try {
      const settings = await invoke<{
        currentThemeId?: string;
        customThemeColors?: Partial<ThemeColors>;
      }>("settings:get");
      const id = settings.currentThemeId || "dark-amber";
      const custom = settings.customThemeColors || {};
      const resolved = resolveTheme(id, custom);
      set({ currentThemeId: id, customColors: custom, resolvedTheme: resolved });
    } catch {
      // keep defaults
    }
  },
}));
