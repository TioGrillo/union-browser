import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Square, X, Maximize2, ChevronUp, ChevronDown } from "lucide-react";
import { send, invoke, on } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";

export function Titlebar() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    invoke<boolean>("window:is-maximized").then((max) => setIsMaximized(max));
    const unsub = on("window:maximized-changed", (maximized: unknown) => {
      setIsMaximized(maximized as boolean);
    });
    return unsub;
  }, []);

  return (
    <div className="drag-region flex items-center h-9 bg-[rgb(var(--bg-base))] border-b border-[rgb(var(--border)/0.3)] select-none shrink-0">
      <div 
        className={cn(
          "flex items-center justify-between px-3 no-drag border-r border-[rgb(var(--border)/0.4)] shrink-0 transition-all duration-300 overflow-hidden",
          sidebarCollapsed ? "w-[56px] justify-center px-0" : "w-[276px]"
        )}
      >
        {!sidebarCollapsed && (
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-accent flex items-center justify-center">
              <span className="text-[7px] font-black text-[rgb(var(--bg-base))]">U</span>
            </div>
            <span className="text-xs font-semibold tracking-wide text-[rgb(var(--text-primary))]">
              UNION
            </span>
          </div>
        )}

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "flex items-center justify-center p-1 rounded-md text-[rgb(var(--text-faint))] hover:text-accent hover:bg-accent/10 transition-colors",
            sidebarCollapsed && "w-full"
          )}
          title={sidebarCollapsed ? "Restaurar menu" : "Minimizar menu para cima"}
        >
          {sidebarCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex no-drag">
        <button
          onClick={() => send("window:minimize")}
          className="h-9 w-11 flex items-center justify-center text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--border)/0.5)] hover:text-[rgb(var(--text-primary))] transition-colors"
          title={t("window:minimize")}
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => send("window:maximize-toggle")}
          className="h-9 w-11 flex items-center justify-center text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--border)/0.5)] hover:text-[rgb(var(--text-primary))] transition-colors"
        >
          {isMaximized ? <Square size={11} /> : <Maximize2 size={12} />}
        </button>
        <button
          onClick={() => send("window:close")}
          className="h-9 w-11 flex items-center justify-center text-[rgb(var(--text-muted))] hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
