import { useAppStore } from "@/stores/appStore";
import { PERFORMANCE_PROFILES } from "@/types/index";
import type { PerformanceProfile, FpsLimit } from "@/types/index";
import { invoke } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { Zap, Battery, Gauge, Settings, Monitor, HardDrive, Cpu, Wind, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const FPS_OPTIONS: { value: FpsLimit; label: string }[] = [
  { value: 0, label: "Ilimitado" },
  { value: 30, label: "30 FPS" },
  { value: 60, label: "60 FPS" },
  { value: 120, label: "120 FPS" },
  { value: 144, label: "144 FPS" },
  { value: 165, label: "165 FPS" },
  { value: 240, label: "240 FPS" },
];

const PROFILE_ICONS: Record<PerformanceProfile, React.ReactNode> = {
  balanced: <Gauge size={20} />,
  eco: <Battery size={20} />,
  performance: <Zap size={20} />,
  custom: <Settings size={20} />,
};

export function PerformanceSettings() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [showAdvanced, setShowAdvanced] = useState(settings.performanceProfile === "custom");

  const activeProfile = settings.performanceProfile || "balanced";
  const profileData = PERFORMANCE_PROFILES[activeProfile] || PERFORMANCE_PROFILES.balanced;

  const handleSelectProfile = (profile: PerformanceProfile) => {
    const preset = PERFORMANCE_PROFILES[profile];
    updateSettings({
      performanceProfile: profile,
      fpsLimit: preset.fpsLimit,
      hardwareAcceleration: preset.hardwareAcceleration,
      maxPanelsMemory: preset.maxPanelsMemory,
      lowPowerMode: preset.lowPowerMode,
      gpuRasterization: preset.gpuRasterization,
      smoothScrolling: preset.smoothScrolling,
      backgroundThrottling: preset.backgroundThrottling,
      maxCacheSizeMB: preset.maxCacheSizeMB,
      autoPurgeCache: preset.autoPurgeCache,
    });
    // Apply to main process
    invoke("performance:apply-fps", preset.fpsLimit === 0 ? 60 : preset.fpsLimit);
    invoke("performance:apply-session", { maxCacheSizeMB: preset.maxCacheSizeMB });
    if (preset.autoPurgeCache) invoke("performance:purge-cache");
    if (profile === "custom") setShowAdvanced(true);
  };

  const handleFpsChange = (fps: FpsLimit) => {
    updateSettings({ fpsLimit: fps });
    invoke("performance:apply-fps", fps === 0 ? 60 : fps);
    if (activeProfile !== "custom") updateSettings({ performanceProfile: "custom" });
  };

  const toggleAdvanced = (key: keyof typeof settings, value: boolean) => {
    updateSettings({ [key]: value } as any);
    // Apply cache changes to main process
    if (key === "maxCacheSizeMB") {
      invoke("performance:apply-session", { maxCacheSizeMB: value as unknown as number });
    }
    if (key === "autoPurgeCache" && value) {
      invoke("performance:purge-cache");
    }
    if (activeProfile !== "custom") updateSettings({ performanceProfile: "custom" });
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-[rgb(var(--text-primary))]">Performance</h3>
        <p className="text-xs text-[rgb(var(--text-faint))] mt-1">
          Controle o consumo de recursos e desempenho do UNION.
        </p>
      </div>

      {/* Profile Cards */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider">
          Perfil de Consumo
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PERFORMANCE_PROFILES) as PerformanceProfile[]).map((profileId) => {
            const profile = PERFORMANCE_PROFILES[profileId];
            const isActive = activeProfile === profileId;
            return (
              <button
                key={profileId}
                onClick={() => handleSelectProfile(profileId)}
                className={cn(
                  "relative flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 text-left group",
                  isActive
                    ? "border-[color:var(--profile-color)] bg-[color:var(--profile-color)]/10 ring-1 ring-[color:var(--profile-color)]/30 shadow-lg"
                    : "border-[rgb(var(--border)/0.4)] bg-[rgb(var(--bg-surface)/0.5)] hover:border-[rgb(var(--border)/0.8)] hover:bg-[rgb(var(--bg-surface)/0.8)]"
                )}
                style={
                  {
                    "--profile-color": profile.color,
                  } as React.CSSProperties
                }
              >
                {/* Active Indicator */}
                {isActive && (
                  <div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: profile.color }}
                  />
                )}

                {/* Icon + Label */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                      isActive ? "bg-[color:var(--profile-color)]/20" : "bg-[rgb(var(--border)/0.3)] group-hover:bg-[rgb(var(--border)/0.5)]"
                    )}
                    style={{ color: isActive ? profile.color : "rgb(var(--text-muted))" }}
                  >
                    {PROFILE_ICONS[profileId]}
                  </div>
                  <div>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isActive ? "text-[color:var(--profile-color)]" : "text-[rgb(var(--text-primary))]"
                        )}
                      >
                        {profile.label}
                      </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-[rgb(var(--text-faint))] leading-relaxed pl-[46px]">
                  {profile.description}
                </p>

                {/* Quick Stats */}
                <div className="flex items-center gap-3 pl-[46px] mt-1">
                  <span className="text-[10px] text-[rgb(var(--text-faint))] bg-[rgb(var(--bg-base)/0.5)] px-2 py-0.5 rounded-full">
                    {profile.fpsLimit === 0 ? "Ilimitado" : `${profile.fpsLimit} FPS`}
                  </span>
                  <span className="text-[10px] text-[rgb(var(--text-faint))] bg-[rgb(var(--bg-base)/0.5)] px-2 py-0.5 rounded-full">
                    {profile.maxPanelsMemory}GB RAM
                  </span>
                  {profile.lowPowerMode && (
                    <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                      Eco
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FPS Limiter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider">
          Limite de FPS
        </label>
        <p className="text-[11px] text-[rgb(var(--text-faint))] -mt-1">
          Controla a taxa de quadros máxima dos painéis web.
        </p>
        <div className="flex flex-wrap gap-2">
          {FPS_OPTIONS.map((opt) => {
            const isActive = settings.fpsLimit === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleFpsChange(opt.value)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-150",
                  isActive
                    ? "bg-accent/15 text-accent border-accent/30 ring-1 ring-accent/20 shadow-sm"
                    : "bg-[rgb(var(--bg-surface)/0.5)] text-[rgb(var(--text-muted))] border-[rgb(var(--border)/0.4)] hover:border-[rgb(var(--border)/0.8)] hover:text-[rgb(var(--text-primary))]"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* FPS Visual Bar */}
        <div className="mt-3 p-3 rounded-xl bg-[rgb(var(--bg-surface)/0.5)] border border-[rgb(var(--border)/0.3)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[rgb(var(--text-faint))]">Fluidez atual</span>
            <span className="text-xs font-bold text-accent">
              {settings.fpsLimit === 0 ? "∞" : settings.fpsLimit} FPS
            </span>
          </div>
          <div className="h-2 bg-[rgb(var(--bg-base)/0.5)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min((settings.fpsLimit === 0 ? 240 : settings.fpsLimit) / 240 * 100, 100)}%`,
                background: `linear-gradient(90deg, ${profileData.color}80, ${profileData.color})`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-[rgb(var(--text-faint))]">0</span>
            <span className="text-[9px] text-[rgb(var(--text-faint))]">60</span>
            <span className="text-[9px] text-[rgb(var(--text-faint))]">120</span>
            <span className="text-[9px] text-[rgb(var(--text-faint))]">240</span>
          </div>
        </div>
      </div>

      {/* Advanced Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
      >
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Configurações Avançadas
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4 pl-2 border-l-2 border-[rgb(var(--border)/0.3)]">
          {/* Hardware Acceleration */}
          <ToggleRow
            icon={<Cpu size={14} />}
            label="Aceleração por Hardware"
            description="Usa a GPU para renderizar. Desative se houver problemas gráficos."
            value={settings.hardwareAcceleration}
            onChange={(v) => toggleAdvanced("hardwareAcceleration", v)}
            activeColor={profileData.color}
          />

          {/* GPU Rasterization */}
          <ToggleRow
            icon={<Monitor size={14} />}
            label="Rasterização GPU"
            description="Renderiza elementos visuais via GPU. Melhora performance gráfica."
            value={settings.gpuRasterization}
            onChange={(v) => toggleAdvanced("gpuRasterization", v)}
            activeColor={profileData.color}
          />

          {/* Smooth Scrolling */}
          <ToggleRow
            icon={<Wind size={14} />}
            label="Scroll Suave"
            description="Animação de rolagem fluida. Desative para economizar recursos."
            value={settings.smoothScrolling}
            onChange={(v) => toggleAdvanced("smoothScrolling", v)}
            activeColor={profileData.color}
          />

          {/* Background Throttling */}
          <ToggleRow
            icon={<Battery size={14} />}
            label="Throttling em Background"
            description="Reduz recursos de painéis em segundo plano. Economiza CPU e RAM."
            value={settings.backgroundThrottling}
            onChange={(v) => toggleAdvanced("backgroundThrottling", v)}
            activeColor={profileData.color}
          />

          {/* Low Power Mode */}
          <ToggleRow
            icon={<Zap size={14} />}
            label="Modo Eco"
            description="Reduz frame rate, desativa animações e limita processos paralelos."
            value={settings.lowPowerMode}
            onChange={(v) => toggleAdvanced("lowPowerMode", v)}
            activeColor={profileData.color}
          />

          {/* Max Panels Memory */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-[rgb(var(--text-faint))]" />
              <span className="text-sm font-medium text-[rgb(var(--text-primary))]">Memória Máx. por Painel</span>
            </div>
            <p className="text-[11px] text-[rgb(var(--text-faint))]">
              Limite de RAM por webview. Mais painéis abertos = mais consumo total.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={32}
                step={1}
                value={settings.maxPanelsMemory}
                onChange={(e) => {
                  updateSettings({ maxPanelsMemory: Number(e.target.value) });
                  if (activeProfile !== "custom") updateSettings({ performanceProfile: "custom" });
                }}
                className="flex-1 h-1.5 rounded-full appearance-none bg-[rgb(var(--border)/0.4)] accent-[rgb(var(--accent))]"
              />
              <span className="text-sm font-bold text-accent w-12 text-right">{settings.maxPanelsMemory}GB</span>
            </div>
            <div className="flex justify-between text-[9px] text-[rgb(var(--text-faint))]">
              <span>1GB</span>
              <span>8GB</span>
              <span>16GB</span>
              <span>32GB</span>
            </div>
          </div>

          {/* Cache Settings */}
          <div className="space-y-3 pt-2 border-t border-[rgb(var(--border)/0.3)]">
            <label className="text-xs font-semibold text-[rgb(var(--text-secondary))] uppercase tracking-wider">
              Cache do Navegador
            </label>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive size={14} className="text-[rgb(var(--text-faint))]" />
                <span className="text-sm font-medium text-[rgb(var(--text-primary))]">Tamanho Máximo do Cache</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={64}
                  max={2048}
                  step={64}
                  value={settings.maxCacheSizeMB}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateSettings({ maxCacheSizeMB: val });
                    invoke("performance:apply-session", { maxCacheSizeMB: val });
                    if (activeProfile !== "custom") updateSettings({ performanceProfile: "custom" });
                  }}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-[rgb(var(--border)/0.4)] accent-[rgb(var(--accent))]"
                />
                <span className="text-sm font-bold text-accent w-16 text-right">{settings.maxCacheSizeMB}MB</span>
              </div>
            </div>

            <ToggleRow
              icon={<HardDrive size={14} />}
              label="Limpeza Automática"
              description="Limpa cache automaticamente ao atingir o limite."
              value={settings.autoPurgeCache}
              onChange={(v) => toggleAdvanced("autoPurgeCache", v)}
              activeColor={profileData.color}
            />
          </div>
        </div>
      )}

      {/* System Info Bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgb(var(--bg-surface)/0.5)] border border-[rgb(var(--border)/0.3)]">
        <Cpu size={14} className="text-[rgb(var(--text-faint))]" />
        <div className="flex-1">
          <span className="text-[11px] text-[rgb(var(--text-faint))]">
            Perfil ativo: <span className="font-semibold text-[rgb(var(--text-secondary))]">{PERFORMANCE_PROFILES[activeProfile].label}</span>
          </span>
        </div>
        <button
          onClick={() => {
            handleSelectProfile("balanced");
          }}
          className="text-[10px] text-accent hover:text-accent-light transition-colors font-medium"
        >
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
  activeColor,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  activeColor: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <span className="text-[rgb(var(--text-faint))] mt-0.5 shrink-0">{icon}</span>
        <div>
          <span className="text-sm font-medium text-[rgb(var(--text-primary))]">{label}</span>
          <p className="text-[11px] text-[rgb(var(--text-faint))] leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-10 h-[22px] rounded-full shrink-0 mt-0.5 transition-colors duration-200"
        style={{
          backgroundColor: value ? activeColor : "rgb(var(--border))",
          opacity: value ? 1 : 0.5,
        }}
      >
        <span
          className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{
            transform: value ? "translateX(18px)" : "translateX(0)",
          }}
        />
      </button>
    </div>
  );
}
