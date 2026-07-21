import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Plus, Globe, GripVertical, VolumeX, Volume2, RotateCw, Maximize2, Minimize2, X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useDialogStore } from "@/stores/dialogStore";
import { useMirrorStore, MIRROR_CAPTURE_SCRIPT, buildReplayScript } from "@/stores/mirrorStore";
import { applyPerformanceToWebview, buildLowPowerScript } from "@/lib/performance";
import { send } from "@/lib/ipc";
import { cn } from "@/lib/utils";

function computeGrid(count: number): { cols: number; rows: number } {
  if (count <= 0) return { cols: 0, rows: 0 };
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  const cols = Math.ceil(Math.sqrt(count));
  return { cols, rows: Math.ceil(count / cols) };
}

function PanelCell({
  account,
  style,
  isMaximized,
  onToggleMaximize,
  onRemove,
}: {
  account: { id: string; name: string; url: string; color: string };
  style: React.CSSProperties;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onRemove?: () => void;
}) {
  const mountPanel = useAppStore((s) => s.mountPanel);
  const unmountPanel = useAppStore((s) => s.unmountPanel);
  const panelStates = useAppStore((s) => s.panelStates);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const selectedAccountIds = useAppStore((s) => s.selectedAccountIds);
  const setActiveAccountId = useAppStore((s) => s.setActiveAccountId);
  const updatePanelState = useAppStore((s) => s.updatePanelState);
  const settings = useAppStore((s) => s.settings);

  const isSelected = selectedAccountIds.includes(account.id);

  const masterAccountId = useMirrorStore((s) => s.masterAccountId);
  // Master is explicitly set
  const isMaster = masterAccountId === account.id;
  // Mirrored (slave) if there is a master, this is not the master, AND this account is selected
  const isMirrored = masterAccountId !== null && !isMaster && isSelected;
  
  const webviewRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  const state = panelStates[account.id];

  useEffect(() => {
    let cancelled = false;
    mountPanel(account.id, account.url).then(() => {
      if (!cancelled) setIsReady(true);
    });
    return () => { cancelled = true; };
  }, [account.id, account.url, mountPanel]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    
    const onStartLoading = () => updatePanelState(account.id, { isLoading: true });
    const onStopLoading = () => updatePanelState(account.id, { isLoading: false, title: wv.getTitle() });
    const onPageTitleUpdated = (e: any) => updatePanelState(account.id, { title: e.title });
    const onDomReady = () => {
      try {
        const wcId = wv.getWebContentsId();
        updatePanelState(account.id, { wcId });
      } catch {}
    };
    
    wv.addEventListener("did-start-loading", onStartLoading);
    wv.addEventListener("did-stop-loading", onStopLoading);
    wv.addEventListener("page-title-updated", onPageTitleUpdated);
    wv.addEventListener("dom-ready", onDomReady);
    
    return () => {
      wv.removeEventListener("did-start-loading", onStartLoading);
      wv.removeEventListener("did-stop-loading", onStopLoading);
      wv.removeEventListener("page-title-updated", onPageTitleUpdated);
      wv.removeEventListener("dom-ready", onDomReady);
    };
  }, [isReady, account.id, updatePanelState]);

  useEffect(() => {
    const handleReload = () => webviewRef.current?.reload();
    const handleBack = () => webviewRef.current?.goBack();
    const handleForward = () => webviewRef.current?.goForward();
    const handleNavigate = (e: any) => webviewRef.current?.loadURL(e.detail.url);
    const handleMute = () => {
      if (webviewRef.current) {
        const currentMuted = webviewRef.current.isAudioMuted();
        webviewRef.current.setAudioMuted(!currentMuted);
        updatePanelState(account.id, { isMuted: !currentMuted });
      }
    };
    const handleZoom = (e: any) => {
      if (webviewRef.current) {
        const factor = e.detail;
        webviewRef.current.setZoomFactor(factor);
        updatePanelState(account.id, { zoom: Math.round(factor * 100) });
      }
    };
    
    window.addEventListener(`panel:reload:${account.id}`, handleReload);
    window.addEventListener(`panel:back:${account.id}`, handleBack);
    window.addEventListener(`panel:forward:${account.id}`, handleForward);
    window.addEventListener(`panel:navigate:${account.id}`, handleNavigate);
    window.addEventListener(`panel:mute:${account.id}`, handleMute);
    window.addEventListener(`panel:zoom:${account.id}`, handleZoom);
    
    return () => {
      window.removeEventListener(`panel:reload:${account.id}`, handleReload);
      window.removeEventListener(`panel:back:${account.id}`, handleBack);
      window.removeEventListener(`panel:forward:${account.id}`, handleForward);
      window.removeEventListener(`panel:navigate:${account.id}`, handleNavigate);
      window.removeEventListener(`panel:mute:${account.id}`, handleMute);
      window.removeEventListener(`panel:zoom:${account.id}`, handleZoom);
    };
  }, [account.id, updatePanelState]);

  // Apply performance settings to webview
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !isReady) return;

    applyPerformanceToWebview(wv, settings);

    if (settings.lowPowerMode) {
      wv.addEventListener("dom-ready", () => {
        wv.executeJavaScript(buildLowPowerScript()).catch(() => {});
      });
      wv.addEventListener("did-navigate", () => {
        setTimeout(() => {
          wv.executeJavaScript(buildLowPowerScript()).catch(() => {});
        }, 300);
      });
    }
  }, [isReady, settings.fpsLimit, settings.lowPowerMode, settings.backgroundThrottling, settings.smoothScrolling]);

  // Mirror: master webview captures events, slaves receive broadcasts
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv || !isReady) return;

    let lastPollIndex = 0;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let injectInterval: ReturnType<typeof setInterval> | null = null;

    if (isMaster) {
      // Inject capture script on dom-ready and navigation
      const injectCapture = () => {
        wv.executeJavaScript(MIRROR_CAPTURE_SCRIPT).catch(() => {});
      };
      wv.addEventListener("dom-ready", injectCapture);
      wv.addEventListener("did-navigate", () => setTimeout(injectCapture, 300));

      // Continuously inject to survive redirects and SPA navigations
      injectInterval = setInterval(() => {
        if (wv.isConnected) injectCapture();
      }, 1000);

      // Poll master webview for new events every 30ms
      pollInterval = setInterval(() => {
        if (!wv.isConnected) return;
        wv.executeJavaScript(
          `(function(){ 
            var arr = window.__mirrorEvents || []; 
            var currentIdx = window.__mirrorEventIndex || 0; 
            var newEvts = arr.filter(function(e){ return e.idx > ${lastPollIndex}; }); 
            return JSON.stringify({ currentIdx: currentIdx, events: newEvts }); 
          })()`
        ).then((result: any) => {
          try {
            const res = JSON.parse(result);
            // If the webview index is smaller than our last poll, it means the page reloaded
            if (res.currentIdx < lastPollIndex) {
              lastPollIndex = res.currentIdx;
            }
            
            const events = res.events;
            if (events.length > 0) {
              lastPollIndex = events[events.length - 1].idx;
              // Broadcast to all slaves via CustomEvent
              events.forEach((evt: any) => {
                window.dispatchEvent(
                  new CustomEvent("__mirror:broadcast__", {
                    detail: { type: evt.type, data: evt.data },
                  })
                );
              });
            }
          } catch {}
        }).catch(() => {});
      }, 30);
    }

    // Slave: listen for broadcasts and replay
    const handleBroadcast = (e: CustomEvent) => {
      if (!isMirrored || !wv.isConnected) return;
      const { type, data } = e.detail;
      const replayScript = buildReplayScript(JSON.stringify({ type, data }));
      wv.executeJavaScript(replayScript).catch(() => {});
    };

    window.addEventListener("__mirror:broadcast__", handleBroadcast as EventListener);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (injectInterval) clearInterval(injectInterval);
      window.removeEventListener("__mirror:broadcast__", handleBroadcast as EventListener);
    };
  }, [account.id, isReady, isMaster, isMirrored]);

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent(`panel:mute:${account.id}`));
  };

  const handleReload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent(`panel:reload:${account.id}`));
  };

  const handleFocus = () => {
    setActiveAccountId(account.id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    unmountPanel(account.id);
    if (onRemove) onRemove();
  };

  const shortUrl = account.url.replace(/^https?:\/\/(www\.)?/, "");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={style}
      onClick={handleFocus}
      className={cn(
        "relative bg-[rgb(var(--bg-base))] rounded-t-xl overflow-hidden border flex flex-col",
        isSelected
          ? "border-accent/80 shadow-[0_0_12px_rgba(var(--accent),0.12)]"
          : "border-[rgb(var(--border))] hover:border-[rgb(var(--border)/0.8)]"
      )}
    >
      {/* Mirror indicator */}
      {isMirrored && (
        <div className="absolute top-2 right-2 z-40 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-bold text-red-400 uppercase">Espelho</span>
        </div>
      )}
      {isMaster && (
        <div className="absolute top-2 right-2 z-40 flex items-center gap-1.5 px-2 py-1 rounded-full bg-[rgb(var(--accent)/0.15)] border border-[rgb(var(--accent)/0.3)] backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-[rgb(var(--accent))] animate-pulse" />
          <span className="text-[9px] font-bold text-[rgb(var(--accent))] uppercase">Master</span>
        </div>
      )}
      {/* Interactive solid header */}
      <div
        className="h-9 bg-[rgb(var(--bg-surface))] border-b border-[rgb(var(--border)/0.6)] px-3 flex items-center justify-between shrink-0 select-none no-drag cursor-grab active:cursor-grabbing"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", account.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData("text/plain");
          if (draggedId && draggedId !== account.id) {
            useAppStore.getState().swapAccounts(draggedId, account.id);
          }
        }}
      >
        <div className="flex items-center gap-2 min-w-0 pointer-events-none">
          <GripVertical size={13} className="text-[rgb(var(--text-faint)/0.5)] mr-0.5" />
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: account.color }} />
          <span className="text-xs font-bold text-[rgb(var(--text-primary))] truncate">{account.name}</span>
          <span className="text-[10px] text-[rgb(var(--text-faint))] truncate max-w-[150px]">{shortUrl}</span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleMute}
            className="p-1 rounded hover:bg-[rgb(var(--border))] text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            {state?.isMuted ? <VolumeX size={10} className="text-red-400" /> : <Volume2 size={10} />}
          </button>
          <button
            onClick={handleReload}
            className="p-1 rounded hover:bg-[rgb(var(--border))] text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <RotateCw size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleMaximize) onToggleMaximize();
            }}
            title={isMaximized ? "Restaurar tamanho" : "Maximizar aba"}
            className="p-1 rounded hover:bg-[rgb(var(--border))] text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            {isMaximized ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-red-500/10 text-[rgb(var(--text-faint))] hover:text-red-400 transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Webview container */}
      <div className="flex-1 relative bg-[rgb(var(--bg-deep))] overflow-hidden">
        {isReady && (
          <webview
            ref={webviewRef}
            src={account.url}
            partition={`persist:panel-${account.id}`}
            className="w-full h-full"
            allowpopups="true"
          />
        )}
        {(!state || state?.isLoading || !isReady) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--bg-deep))] z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-[9px] text-[rgb(var(--text-faint))] truncate max-w-[150px]">
                {state?.url || account.url}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ResizeHandle({
  direction,
  onDrag,
  onReset,
}: {
  direction: "horizontal" | "vertical";
  onDrag: (delta: number) => void;
  onReset?: () => void;
}) {
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let lastPos = direction === "horizontal" ? e.clientX : e.clientY;

      const onMouseMove = (e: MouseEvent) => {
        const current = direction === "horizontal" ? e.clientX : e.clientY;
        onDrag(current - lastPos);
        lastPos = current;
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    };

    el.addEventListener("mousedown", onMouseDown);
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, [direction, onDrag]);

  const isHorizontal = direction === "horizontal";

  return (
    <div
      ref={handleRef}
      onDoubleClick={() => onReset?.()}
      className={cn(
        "absolute z-30 flex items-center justify-center",
        "bg-transparent hover:bg-accent/20 active:bg-accent/40 transition-colors",
        isHorizontal
          ? "right-0 top-0 bottom-0 w-1 cursor-col-resize group/handle"
          : "bottom-0 left-0 right-0 h-1 cursor-row-resize group/handle"
      )}
    >
      <GripVertical
        size={8}
        className={cn(
          "text-[rgb(var(--border)/0.5)] opacity-0 group-hover/handle:opacity-100 transition-opacity",
          !isHorizontal && "rotate-90"
        )}
      />
    </div>
  );
}

function EmptyDashboard() {
  const { t } = useTranslation();
  const openDialog = useDialogStore((s) => s.open);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);

  return (
    <div className="flex-1 flex items-center justify-center bg-[rgb(var(--bg-base))]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgb(var(--border)/0.4)] border border-[rgb(var(--border)/0.3)] flex items-center justify-center">
          <Globe size={28} className="text-[rgb(var(--text-faint))]" />
        </div>
        <h3 className="text-sm font-semibold text-[rgb(var(--text-secondary))] mb-1">{t("dashboard.empty")}</h3>
        <p className="text-xs text-[rgb(var(--text-faint))] mb-4">{t("dashboard.emptyHint")}</p>
        {activeWorkspaceId && (
          <button
            onClick={() => openDialog({ type: "create-account", workspaceId: activeWorkspaceId })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-[#060913] text-xs font-semibold hover:bg-accent-light transition-colors shadow-glow"
          >
            <Plus size={14} />
            {t("account.create")}
          </button>
        )}
      </motion.div>
    </div>
  );
}

export function Dashboard() {
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const accounts = useAppStore((s) => s.accounts);
  const unmountPanel = useAppStore((s) => s.unmountPanel);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelStates = useAppStore((s) => s.panelStates);
  const gridLayout = useAppStore((s) => s.gridLayout);
  const maximizedId = useAppStore((s) => s.maximizedId);
  const setMaximizedId = useAppStore((s) => s.setMaximizedId);
  const workspaceAccounts = accounts.filter((a) => a.workspaceId === activeWorkspaceId);
  const activeAccountsInWorkspace = workspaceAccounts.filter((a) => panelStates[a.id]);

  const displayedAccounts = maximizedId && activeAccountsInWorkspace.some(a => a.id === maximizedId)
    ? activeAccountsInWorkspace.filter((a) => a.id === maximizedId)
    : gridLayout === "single" && activeAccountsInWorkspace.length > 0
      ? activeAccountsInWorkspace.slice(0, 1)
      : activeAccountsInWorkspace;

  const [colSizes, setColSizes] = useState<number[]>([]);
  const [rowSizes, setRowSizes] = useState<number[]>([]);

  let cols = 1;
  let rows = 1;

  if (gridLayout === "single" || displayedAccounts.length <= 1) {
    cols = 1;
    rows = 1;
  } else if (gridLayout === "columns") {
    cols = displayedAccounts.length;
    rows = 1;
  } else if (gridLayout === "rows") {
    cols = 1;
    rows = displayedAccounts.length;
  } else {
    // "auto" or "free"
    const computed = computeGrid(displayedAccounts.length);
    cols = computed.cols;
    rows = computed.rows;
  }

  const resetSizes = useCallback(() => {
    setColSizes(Array(cols).fill(100 / cols));
    setRowSizes(Array(rows).fill(100 / rows));
  }, [cols, rows]);

  useEffect(() => {
    resetSizes();
  }, [cols, rows, resetSizes]);

  const handleColDrag = useCallback((colIndex: number, delta: number) => {
    if (!gridRef.current) return;
    const totalWidth = gridRef.current.clientWidth;
    if (totalWidth <= 0) return;

    const deltaPercent = (delta / totalWidth) * 100;

    setColSizes((prev) => {
      const next = [...prev];
      const minSize = 10;

      const target = colIndex + 1 < next.length ? colIndex + 1 : colIndex - 1;
      if (target < 0 || target >= next.length) return prev;

      const newCol = Math.max(minSize, next[colIndex] + deltaPercent);
      const newTarget = Math.max(minSize, next[target] - deltaPercent);

      next[colIndex] = newCol;
      next[target] = newTarget;
      return next;
    });
  }, []);

  const handleRowDrag = useCallback((rowIndex: number, delta: number) => {
    if (!gridRef.current) return;
    const totalHeight = gridRef.current.clientHeight;
    if (totalHeight <= 0) return;

    const deltaPercent = (delta / totalHeight) * 100;

    setRowSizes((prev) => {
      const next = [...prev];
      const minSize = 10;

      const target = rowIndex + 1 < next.length ? rowIndex + 1 : rowIndex - 1;
      if (target < 0 || target >= next.length) return prev;

      const newRow = Math.max(minSize, next[rowIndex] + deltaPercent);
      const newTarget = Math.max(minSize, next[target] - deltaPercent);

      next[rowIndex] = newRow;
      next[target] = newTarget;
      return next;
    });
  }, []);

  if (!activeWorkspaceId) return null;

  if (workspaceAccounts.length === 0) {
    return <EmptyDashboard />;
  }

  if (activeAccountsInWorkspace.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[rgb(var(--bg-base))]">
        <div className="text-center text-[rgb(var(--text-faint))] text-sm">
          Nenhuma tela ativa. Ligue uma conta no menu lateral para visualizar.
        </div>
      </div>
    );
  }

  return (
    <div ref={gridRef} className="flex-1 p-2 overflow-hidden bg-[rgb(var(--bg-base))]">
      <div
        className="w-full h-full relative"
        style={{
          display: "grid",
          gridTemplateColumns: colSizes.map((s) => `${s}%`).join(" "),
          gridTemplateRows: rowSizes.map((s) => `${s}%`).join(" "),
          gap: 0,
        }}
      >
        {displayedAccounts.map((account, index) => {
          const col = (index % cols) + 1;
          const row = Math.floor(index / cols) + 1;
          const isLastCol = col === cols;
          const isLastRow = row === rows;

          return (
            <div
              key={account.id}
              className="relative p-0.5"
              style={{
                gridColumn: `${col} / span 1`,
                gridRow: `${row} / span 1`,
              }}
            >
              <PanelCell
                account={account}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                isMaximized={maximizedId === account.id}
                onToggleMaximize={() => setMaximizedId(maximizedId === account.id ? null : account.id)}
                onRemove={() => unmountPanel(account.id)}
              />
              {/* Vertical resize handle */}
              {!isLastCol && (
                <ResizeHandle
                  direction="horizontal"
                  onDrag={(d) => handleColDrag(col - 1, d)}
                  onReset={resetSizes}
                />
              )}
              {/* Horizontal resize handle */}
              {!isLastRow && (
                <ResizeHandle
                  direction="vertical"
                  onDrag={(d) => handleRowDrag(row - 1, d)}
                  onReset={resetSizes}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
