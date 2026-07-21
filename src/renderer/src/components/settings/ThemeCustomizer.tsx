import { useState } from "react";
import { Palette, RotateCcw, Check, Paintbrush } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { ThemeColors, THEME_PRESETS, hexToRgba } from "@/lib/themes";
import { cn } from "@/lib/utils";

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  bgDeep: "Fundo profundo",
  bgBase: "Fundo base",
  bgSurface: "Superfície",
  bgElevated: "Elevado",
  bgOverlay: "Overlay",
  textPrimary: "Texto primário",
  textSecondary: "Texto secundário",
  textMuted: "Texto muted",
  textFaint: "Texto faint",
  accentDefault: "Accent",
  accentLight: "Accent claro",
  accentDark: "Accent escuro",
  borderDefault: "Borda",
  borderSubtle: "Borda sutil",
  borderMuted: "Borda muted",
  success: "Sucesso",
  warning: "Aviso",
  danger: "Perigo",
  scrollbarThumb: "Scroll thumb",
  scrollbarHover: "Scroll hover",
};

const COLOR_GROUPS = [
  {
    label: "Fundos",
    keys: ["bgDeep", "bgBase", "bgSurface", "bgElevated", "bgOverlay"] as (keyof ThemeColors)[],
  },
  {
    label: "Texto",
    keys: ["textPrimary", "textSecondary", "textMuted", "textFaint"] as (keyof ThemeColors)[],
  },
  {
    label: "Accent",
    keys: ["accentDefault", "accentLight", "accentDark"] as (keyof ThemeColors)[],
  },
  {
    label: "Bordas",
    keys: ["borderDefault"] as (keyof ThemeColors)[],
  },
  {
    label: "Status",
    keys: ["success", "warning", "danger"] as (keyof ThemeColors)[],
  },
];

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] text-[rgb(var(--text-muted))] min-w-0 truncate">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-7 h-7 rounded-lg border border-[rgb(var(--border))] cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          className="w-20 px-2 py-1 text-[10px] font-mono bg-[rgb(var(--bg-overlay))] border border-[rgb(var(--border))] rounded-md text-[rgb(var(--text-secondary))] focus:outline-none focus:border-[rgb(var(--accent))]"
        />
      </div>
    </div>
  );
}

export function ThemeCustomizer() {
  const currentThemeId = useThemeStore((s) => s.currentThemeId);
  const customColors = useThemeStore((s) => s.customColors);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setCustomColor = useThemeStore((s) => s.setCustomColor);
  const resetCustomColors = useThemeStore((s) => s.resetCustomColors);

  const [activeGroup, setActiveGroup] = useState(0);
  const [showPresets, setShowPresets] = useState(true);

  const hasCustomizations = Object.keys(customColors).length > 0;

  return (
    <div className="space-y-6">
      {/* Theme Preset Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">
            Temas
          </h3>
          {hasCustomizations && (
            <button
              onClick={resetCustomColors}
              className="flex items-center gap-1.5 text-[10px] text-[rgb(var(--text-faint))] hover:text-[rgb(var(--accent))] transition-colors"
            >
              <RotateCcw size={10} />
              Resetar customizações
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PRESETS.map((preset) => {
            const isActive = preset.id === currentThemeId;
            const c = preset.colors;
            return (
              <button
                key={preset.id}
                onClick={() => setTheme(preset.id)}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                  isActive
                    ? "border-[rgb(var(--accent)/0.5)] bg-[rgb(var(--accent)/0.05)] shadow-[0_0_12px_rgb(var(--accent)/0.1)]"
                    : "border-[rgb(var(--border)/0.5)] bg-[rgb(var(--bg-overlay)/0.3)] hover:border-[rgb(var(--border))] hover:bg-[rgb(var(--bg-overlay)/0.5)]"
                )}
              >
                {/* Color preview */}
                <div className="w-full h-8 rounded-lg overflow-hidden flex">
                  <div className="flex-1" style={{ background: c.bgDeep }} />
                  <div className="flex-1" style={{ background: c.bgBase }} />
                  <div className="flex-1" style={{ background: c.bgSurface }} />
                  <div className="flex-1" style={{ background: c.bgElevated }} />
                  <div className="w-2 rounded-r-lg" style={{ background: c.accentDefault }} />
                </div>
                <span className={cn(
                  "text-[11px] font-medium",
                  isActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--text-secondary))]"
                )}>
                  {preset.name}
                </span>
                {isActive && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[rgb(var(--accent))] flex items-center justify-center">
                    <Check size={10} className="text-[rgb(var(--bg-deep))]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Color Editor */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Paintbrush size={12} className="text-[rgb(var(--accent))]" />
          <h3 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">
            Customizar Cores
          </h3>
        </div>

        {/* Group tabs */}
        <div className="flex gap-1 mb-3 p-1 bg-[rgb(var(--bg-overlay)/0.3)] rounded-lg">
          {COLOR_GROUPS.map((group, i) => (
            <button
              key={group.label}
              onClick={() => setActiveGroup(i)}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-medium rounded-md transition-colors",
                activeGroup === i
                  ? "bg-[rgb(var(--accent)/0.15)] text-[rgb(var(--accent))]"
                  : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-muted))]"
              )}
            >
              {group.label}
            </button>
          ))}
        </div>

        {/* Color inputs for active group */}
        <div className="space-y-0.5 p-3 bg-[rgb(var(--bg-overlay)/0.2)] rounded-xl border border-[rgb(var(--border)/0.3)]">
          {COLOR_GROUPS[activeGroup].keys.map((key) => (
            <ColorInput
              key={key}
              label={COLOR_LABELS[key]}
              value={customColors[key] ?? resolvedTheme.colors[key]}
              onChange={(v) => setCustomColor(key, v)}
            />
          ))}
        </div>

        {/* Live preview */}
        <div className="mt-3 p-3 rounded-xl border border-[rgb(var(--border)/0.3)] bg-[rgb(var(--bg-base))]">
          <div className="text-[10px] text-[rgb(var(--text-faint))] mb-2 font-medium uppercase tracking-wider">
            Preview
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{
                background: hexToRgba(customColors.accentDefault ?? resolvedTheme.colors.accentDefault, 0.15),
                color: customColors.accentDefault ?? resolvedTheme.colors.accentDefault,
                border: `1px solid ${hexToRgba(customColors.accentDefault ?? resolvedTheme.colors.accentDefault, 0.3)}`,
              }}
            >
              Aa
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold" style={{ color: customColors.textPrimary ?? resolvedTheme.colors.textPrimary }}>
                Texto primário
              </span>
              <span className="text-[10px]" style={{ color: customColors.textMuted ?? resolvedTheme.colors.textMuted }}>
                Texto muted
              </span>
            </div>
            <div className="ml-auto flex gap-1">
              <div
                className="w-5 h-5 rounded-md"
                style={{ background: customColors.success ?? resolvedTheme.colors.success }}
              />
              <div
                className="w-5 h-5 rounded-md"
                style={{ background: customColors.warning ?? resolvedTheme.colors.warning }}
              />
              <div
                className="w-5 h-5 rounded-md"
                style={{ background: customColors.danger ?? resolvedTheme.colors.danger }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
