export interface ThemeColors {
  // Backgrounds
  bgDeep: string;
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgOverlay: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;

  // Accent
  accentDefault: string;
  accentLight: string;
  accentDark: string;

  // Borders
  borderDefault: string;
  borderSubtle: string;
  borderMuted: string;

  // Status
  success: string;
  warning: string;
  danger: string;

  // Scrollbar
  scrollbarThumb: string;
  scrollbarHover: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  isDark: boolean;
}

export const THEME_PRESETS: Theme[] = [
  {
    id: "dark-amber",
    name: "Dark Amber",
    description: "Tema escuro com accent dourado/amber",
    isDark: true,
    colors: {
      bgDeep: "#03050a",
      bgBase: "#060913",
      bgSurface: "#0c0f1d",
      bgElevated: "#121829",
      bgOverlay: "#0f172a",
      textPrimary: "#e2e8f0",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      textFaint: "#64748b",
      accentDefault: "#f59e0b",
      accentLight: "#fbbf24",
      accentDark: "#d97706",
      borderDefault: "#1e293b",
      borderSubtle: "rgba(30, 41, 59, 0.4)",
      borderMuted: "rgba(15, 23, 42, 0.4)",
      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#ef4444",
      scrollbarThumb: "#334155",
      scrollbarHover: "#475569",
    },
  },
  {
    id: "dark-indigo",
    name: "Dark Indigo",
    description: "Tema escuro com accent indigo vibrante",
    isDark: true,
    colors: {
      bgDeep: "#020409",
      bgBase: "#050a16",
      bgSurface: "#0a1128",
      bgElevated: "#111d3e",
      bgOverlay: "#0b1a33",
      textPrimary: "#e2e8f0",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      textFaint: "#64748b",
      accentDefault: "#6366f1",
      accentLight: "#818cf8",
      accentDark: "#4f46e5",
      borderDefault: "#1e293b",
      borderSubtle: "rgba(30, 41, 59, 0.4)",
      borderMuted: "rgba(15, 23, 42, 0.4)",
      success: "#22c55e",
      warning: "#eab308",
      danger: "#ef4444",
      scrollbarThumb: "#334155",
      scrollbarHover: "#475569",
    },
  },
  {
    id: "light",
    name: "Light",
    description: "Tema claro elegante",
    isDark: false,
    colors: {
      bgDeep: "#f8fafc",
      bgBase: "#f1f5f9",
      bgSurface: "#ffffff",
      bgElevated: "#f8fafc",
      bgOverlay: "#e2e8f0",
      textPrimary: "#0f172a",
      textSecondary: "#334155",
      textMuted: "#64748b",
      textFaint: "#94a3b8",
      accentDefault: "#6366f1",
      accentLight: "#818cf8",
      accentDark: "#4f46e5",
      borderDefault: "#e2e8f0",
      borderSubtle: "rgba(226, 232, 240, 0.6)",
      borderMuted: "rgba(241, 245, 249, 0.8)",
      success: "#16a34a",
      warning: "#d97706",
      danger: "#dc2626",
      scrollbarThumb: "#cbd5e1",
      scrollbarHover: "#94a3b8",
    },
  },
  {
    id: "midnight",
    name: "Midnight Blue",
    description: "Azul profundo com accent ciano",
    isDark: true,
    colors: {
      bgDeep: "#010313",
      bgBase: "#020620",
      bgSurface: "#081030",
      bgElevated: "#0f1a40",
      bgOverlay: "#0a1535",
      textPrimary: "#e0e7ff",
      textSecondary: "#c7d2fe",
      textMuted: "#a5b4fc",
      textFaint: "#818cf8",
      accentDefault: "#06b6d4",
      accentLight: "#22d3ee",
      accentDark: "#0891b2",
      borderDefault: "#1e293b",
      borderSubtle: "rgba(30, 41, 59, 0.5)",
      borderMuted: "rgba(8, 16, 48, 0.5)",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f87171",
      scrollbarThumb: "#1e3a5f",
      scrollbarHover: "#2563eb",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Escuro com accent esmeralda",
    isDark: true,
    colors: {
      bgDeep: "#020a08",
      bgBase: "#040f0c",
      bgSurface: "#081a15",
      bgElevated: "#0f2a22",
      bgOverlay: "#0a201a",
      textPrimary: "#ecfdf5",
      textSecondary: "#d1fae5",
      textMuted: "#a7f3d0",
      textFaint: "#6ee7b7",
      accentDefault: "#10b981",
      accentLight: "#34d399",
      accentDark: "#059669",
      borderDefault: "#1e293b",
      borderSubtle: "rgba(30, 41, 59, 0.4)",
      borderMuted: "rgba(8, 26, 21, 0.5)",
      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#ef4444",
      scrollbarThumb: "#1a4030",
      scrollbarHover: "#059669",
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Escuro com accent rosa/rose",
    isDark: true,
    colors: {
      bgDeep: "#0a0308",
      bgBase: "#100510",
      bgSurface: "#1a0a1e",
      bgElevated: "#261030",
      bgOverlay: "#1c0c24",
      textPrimary: "#fdf2f8",
      textSecondary: "#fbcfe8",
      textMuted: "#f9a8d4",
      textFaint: "#f472b6",
      accentDefault: "#f43f5e",
      accentLight: "#fb7185",
      accentDark: "#e11d48",
      borderDefault: "#1e293b",
      borderSubtle: "rgba(30, 41, 59, 0.4)",
      borderMuted: "rgba(26, 10, 30, 0.5)",
      success: "#22c55e",
      warning: "#eab308",
      danger: "#dc2626",
      scrollbarThumb: "#3b1a30",
      scrollbarHover: "#9d174d",
    },
  },
];

export function hexToRgbChannels(hex: string): string {
  if (hex.startsWith("rgb")) {
    const match = hex.match(/[\d.]+/g);
    if (match) return match.slice(0, 3).join(" ");
    return "0 0 0";
  }
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith("rgb")) {
    return hex.replace(")", `, ${alpha})`).replace("rgb", "rgba");
  }
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function themeToCssVariables(theme: Theme): Record<string, string> {
  const c = theme.colors;
  return {
    "--bg-deep": hexToRgbChannels(c.bgDeep),
    "--bg-base": hexToRgbChannels(c.bgBase),
    "--bg-surface": hexToRgbChannels(c.bgSurface),
    "--bg-elevated": hexToRgbChannels(c.bgElevated),
    "--bg-overlay": hexToRgbChannels(c.bgOverlay),
    "--text-primary": hexToRgbChannels(c.textPrimary),
    "--text-secondary": hexToRgbChannels(c.textSecondary),
    "--text-muted": hexToRgbChannels(c.textMuted),
    "--text-faint": hexToRgbChannels(c.textFaint),
    "--accent": hexToRgbChannels(c.accentDefault),
    "--accent-light": hexToRgbChannels(c.accentLight),
    "--accent-dark": hexToRgbChannels(c.accentDark),
    "--border": hexToRgbChannels(c.borderDefault),
    "--border-subtle": c.borderSubtle,
    "--border-muted": c.borderMuted,
    "--success": hexToRgbChannels(c.success),
    "--warning": hexToRgbChannels(c.warning),
    "--danger": hexToRgbChannels(c.danger),
    "--scrollbar-thumb": hexToRgbChannels(c.scrollbarThumb),
    "--scrollbar-hover": hexToRgbChannels(c.scrollbarHover),
    "--bg-deep-hex": c.bgDeep,
    "--bg-base-hex": c.bgBase,
    "--bg-surface-hex": c.bgSurface,
    "--bg-elevated-hex": c.bgElevated,
    "--accent-hex": c.accentDefault,
    "--text-primary-hex": c.textPrimary,
    "--text-secondary-hex": c.textSecondary,
    "--text-muted-hex": c.textMuted,
    "--text-faint-hex": c.textFaint,
    "--danger-hex": c.danger,
    "--success-hex": c.success,
  };
}

export function getThemeById(id: string): Theme {
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
}

export function mergeWithCustomColors(
  base: Theme,
  customColors: Partial<ThemeColors>
): Theme {
  return {
    ...base,
    colors: { ...base.colors, ...customColors },
  };
}
