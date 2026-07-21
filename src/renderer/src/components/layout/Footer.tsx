import { useState, useEffect } from "react";
import { Cpu, Database, Activity, Clock, Cpu as CpuIcon } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { invoke } from "@/lib/ipc";

export function Footer() {
  const workspaces = useAppStore((s) => s.workspaces);
  const accounts = useAppStore((s) => s.accounts);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const panelStates = useAppStore((s) => s.panelStates);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const workspaceAccounts = accounts.filter((a) => a.workspaceId === activeWorkspaceId);
  const activeCount = workspaceAccounts.length;
  const onlineCount = workspaceAccounts.filter((a) => !!panelStates[a.id]).length;

  const [metrics, setMetrics] = useState({
    cpu: "0.0",
    ram: "0",
    fps: "60", // Hardcoded max FPS unless we poll it via renderer
    time: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const sysMetrics = await invoke<{ totalCpu: number; totalRam: number }>("system:metrics");
        setMetrics((prev) => ({
          ...prev,
          cpu: sysMetrics.totalCpu.toFixed(1),
          ram: sysMetrics.totalRam.toString(),
        }));
      } catch (e) {
        // ignore
      }
    };

    const timer = setInterval(() => {
      fetchMetrics();
      setMetrics((prev) => ({ ...prev, time: prev.time + 1 }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="h-9 bg-[rgb(var(--bg-base))] border-t border-[rgb(var(--border)/0.4)] px-4 flex items-center justify-between text-[11px] text-[rgb(var(--text-muted))] select-none shrink-0 no-drag">
      {/* Left side info */}
      <div className="flex items-center gap-3.5">
        <span className="flex items-center gap-1 font-medium text-green-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Conectado
        </span>
        <span className="text-[rgb(var(--text-muted))] font-semibold">{activeWorkspace?.name || "Workspace"}</span>
        <span>Grade automática &middot; {activeCount}</span>
        {onlineCount > 0 && (
          <span className="text-accent">{onlineCount} ativa(s)</span>
        )}
      </div>

      {/* Right side system metrics */}
      <div className="flex items-center gap-5 font-mono">
        <span className="flex items-center gap-1.5">
          <CpuIcon size={12} className="text-[rgb(var(--text-faint))]" />
          {metrics.cpu}%
        </span>
        <span className="flex items-center gap-1.5">
          <Database size={12} className="text-[rgb(var(--text-faint))]" />
          {metrics.ram} MB
        </span>
        <span className="flex items-center gap-1.5">
          <Activity size={12} className="text-[rgb(var(--text-faint))]" />
          {metrics.fps} FPS
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} className="text-[rgb(var(--text-faint))]" />
          {formatTime(metrics.time)}
        </span>
        <span className="text-[rgb(var(--text-faint))]">Versão 1.0.0</span>
      </div>
    </div>
  );
}
