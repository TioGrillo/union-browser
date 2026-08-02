import { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Globe, GripVertical, VolumeX, Volume2, RotateCw, Maximize2, Minimize2, X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useDialogStore } from "@/stores/dialogStore";
import { useMirrorStore, MIRROR_CAPTURE_SCRIPT, buildReplayScript } from "@/stores/mirrorStore";
import { applyPerformanceToWebview, buildLowPowerScript } from "@/lib/performance";
import { send } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { ContextMenu } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Navigation, Star } from "lucide-react";

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
  onContextMenu,
}: {
  account: { id: string; name: string; url: string; color: string };
  style: React.CSSProperties;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onRemove?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
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
  // Track mount state separately to avoid re-calling mountPanel on React remounts
  const hasMounted = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const state = panelStates[account.id];

  useEffect(() => {
    // If already in panelStates (e.g. after a remount), mark as ready without IPC call
    if (panelStates[account.id]) {
      setIsReady(true);
      hasMounted.current = true;
      return;
    }
    if (hasMounted.current) return;
    hasMounted.current = true;
    let cancelled = false;
    mountPanel(account.id, account.url).then(() => {
      if (!cancelled) setIsReady(true);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.id]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    
    const onStartLoading = () => updatePanelState(account.id, { isLoading: true });
    const onStopLoading = () => updatePanelState(account.id, { isLoading: false, title: wv.getTitle() });
    const onPageTitleUpdated = (e: any) => updatePanelState(account.id, { title: e.title });
    const onDidNavigate = (e: any) => {
      const { settings, updateSettings } = useAppStore.getState();
      const history = settings.history || [];
      const newHistory = [{ url: e.url, title: wv.getTitle() || e.url, timestamp: Date.now(), accountId: account.id }, ...history].slice(0, 500); // keep last 500
      updateSettings({ history: newHistory });
    };
    const onDomReady = () => {
      try {
        const wcId = wv.getWebContentsId();
        updatePanelState(account.id, { wcId });
      } catch {}
    };
    
    wv.addEventListener("did-start-loading", onStartLoading);
    wv.addEventListener("did-stop-loading", onStopLoading);
    wv.addEventListener("page-title-updated", onPageTitleUpdated);
    wv.addEventListener("did-navigate", onDidNavigate);
    wv.addEventListener("dom-ready", onDomReady);
    
    return () => {
      wv.removeEventListener("did-start-loading", onStartLoading);
      wv.removeEventListener("did-stop-loading", onStopLoading);
      wv.removeEventListener("page-title-updated", onPageTitleUpdated);
      wv.removeEventListener("did-navigate", onDidNavigate);
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

  // Apply performance settings and zoom injection after webview is ready
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

    // Zoom via CTRL+Scroll: inject listener into page
    const injectZoomScript = () => {
      try {
        wv.executeJavaScript(`
          if (!window.__zoomListenerInjected) {
            window.__zoomListenerInjected = true;
            window.addEventListener('wheel', function(e) {
              if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                console.log(e.deltaY > 0 ? '__ZOOM_OUT__' : '__ZOOM_IN__');
              }
            }, { passive: false, capture: true });
          }
        `).catch(() => {});
      } catch {}
    };

    // Zoom: listen for console messages from injected script
    const onConsoleMessage = (e: any) => {
      const store = useAppStore.getState();
      if (e.message === '__ZOOM_IN__') {
        const currentZoom = (store.panelStates[account.id]?.zoom || 100) / 100;
        const factor = Math.min(5, currentZoom + 0.1);
        wv.setZoomFactor(factor);
        updatePanelState(account.id, { zoom: Math.round(factor * 100) });
      } else if (e.message === '__ZOOM_OUT__') {
        const currentZoom = (store.panelStates[account.id]?.zoom || 100) / 100;
        const factor = Math.max(0.25, currentZoom - 0.1);
        wv.setZoomFactor(factor);
        updatePanelState(account.id, { zoom: Math.round(factor * 100) });
      }
    };

    wv.addEventListener('console-message', onConsoleMessage);
    wv.addEventListener('dom-ready', injectZoomScript);
    wv.addEventListener('did-navigate', () => setTimeout(injectZoomScript, 300));
    // NOTE: do NOT call injectZoomScript() immediately here — the webview may not
    // have emitted dom-ready yet, and executeJavaScript would throw.

    return () => {
      wv.removeEventListener('console-message', onConsoleMessage);
    };


  }, [isReady, account.id, updatePanelState, settings.fpsLimit, settings.lowPowerMode, settings.backgroundThrottling, settings.smoothScrolling]);

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

  const handleFocus = (e?: React.MouseEvent) => {
    console.log('[PanelCell] handleFocus called for', account.id, 'ctrlKey:', e?.ctrlKey);
    setActiveAccountId(account.id);
    const store = useAppStore.getState();
    const currentSelected = store.selectedAccountIds;

    if (e && e.ctrlKey) {
      if (currentSelected.includes(account.id)) {
        store.setSelectedAccountIds(currentSelected.filter(id => id !== account.id));
      } else {
        store.setSelectedAccountIds([...currentSelected, account.id]);
      }
    } else {
      store.setSelectedAccountIds([account.id]);
    }
    console.log('[PanelCell] selectedAccountIds after set:', useAppStore.getState().selectedAccountIds);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    unmountPanel(account.id);
    if (onRemove) onRemove();
  };

  const shortUrl = account.url.replace(/^https?:\/\/(www\.)?/, "");

  return (
    <div
      style={style}
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
      {/* Header: click to select, drag grip to reorder */}
      <div
        className="h-9 bg-[rgb(var(--bg-surface))] border-b border-[rgb(var(--border)/0.6)] px-3 flex items-center justify-between shrink-0 select-none"
        onMouseDown={(e) => {
          if (e.button === 0) handleFocus(e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFocus(e);
          if (onContextMenu) onContextMenu(e);
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
        <div className="flex items-center gap-2 min-w-0">
          {/* Only the grip icon is draggable to avoid blocking mousedown on the whole header */}
          <span
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", account.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab active:cursor-grabbing shrink-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical size={13} className="text-[rgb(var(--text-faint)/0.5)] mr-0.5" />
          </span>
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: account.color }} />
          <span className="text-xs font-bold text-[rgb(var(--text-primary))] truncate">{account.name}</span>
          <span className="text-[10px] text-[rgb(var(--text-faint))] truncate max-w-[150px]">{shortUrl}</span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleMute}
            className="p-1 rounded hover:bg-[rgb(var(--border))] text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            {state?.isMuted ? <VolumeX size={10} className="text-red-400" /> : <Volume2 size={10} />}
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleReload}
            className="p-1 rounded hover:bg-[rgb(var(--border))] text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <RotateCw size={10} />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
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
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClose}
            className="p-1 rounded hover:bg-red-500/10 text-[rgb(var(--text-faint))] hover:text-red-400 transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Webview container — always in DOM to prevent process kill */}
      <div className="flex-1 relative bg-[rgb(var(--bg-deep))] overflow-hidden">
        <webview
          ref={webviewRef}
          src={account.url}
          partition={`persist:panel-${account.id}`}
          className="w-full h-full"
          allowpopups={true}
          style={{ visibility: isReady ? "visible" : "hidden" }}
        />
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
    </div>
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
  // Keep a stable ref to onDrag so the effect never needs to re-run
  const onDragRef = useRef(onDrag);
  useEffect(() => { onDragRef.current = onDrag; }, [onDrag]);

  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let lastPos = direction === "horizontal" ? e.clientX : e.clientY;

      const onMouseMove = (e: MouseEvent) => {
        const current = direction === "horizontal" ? e.clientX : e.clientY;
        const delta = current - lastPos;
        lastPos = current;
        // Call through ref so we always use the latest callback
        onDragRef.current(delta);
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
    // Only direction in deps — onDrag is handled via ref above
    return () => el.removeEventListener("mousedown", onMouseDown);
  }, [direction]);

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
  const workspaces = useAppStore((s) => s.workspaces);
  const accounts = useAppStore((s) => s.accounts);
  const unmountPanel = useAppStore((s) => s.unmountPanel);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const setIsOverlayOpen = useAppStore((s) => s.setIsOverlayOpen);
  const openDialog = useDialogStore((s) => s.open);
  
  const [panelContextMenu, setPanelContextMenu] = useState<{ x: number; y: number; accountId: string } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelStates = useAppStore((s) => s.panelStates);
  const gridLayout = useAppStore((s) => s.gridLayout);
  const maximizedId = useAppStore((s) => s.maximizedId);
  const setMaximizedId = useAppStore((s) => s.setMaximizedId);
  const workspaceAccounts = accounts.filter((a) => a.workspaceId === activeWorkspaceId);
  const activeAccountsInWorkspace = workspaceAccounts.filter((a) => panelStates[a.id]);

  const isMaximizedMode = !!(maximizedId && activeAccountsInWorkspace.some(a => a.id === maximizedId));

  // ALWAYS compute grid dimensions from the total active accounts count,
  // regardless of whether a panel is maximized. This prevents the grid from
  // collapsing to 1x1 when maximizing, which would cause a layout recalc
  // on restore and force webviews to reload.
  const totalCount = activeAccountsInWorkspace.length;
  let cols = 1;
  let rows = 1;

  if (gridLayout === "single" || totalCount <= 1) {
    cols = 1;
    rows = 1;
  } else if (gridLayout === "columns") {
    cols = totalCount;
    rows = 1;
  } else if (gridLayout === "rows") {
    cols = 1;
    rows = totalCount;
  } else {
    const computed = computeGrid(totalCount);
    cols = computed.cols;
    rows = computed.rows;
  }

  const [colSizes, setColSizes] = useState<number[]>([]);
  const [rowSizes, setRowSizes] = useState<number[]>([]);

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

      const sum = next[colIndex] + next[target];
      let newCol = next[colIndex] + (target > colIndex ? deltaPercent : -deltaPercent);
      let newTarget = next[target] - (target > colIndex ? deltaPercent : -deltaPercent);

      if (newCol < minSize) {
        newCol = minSize;
        newTarget = sum - minSize;
      } else if (newTarget < minSize) {
        newTarget = minSize;
        newCol = sum - minSize;
      }

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

      const sum = next[rowIndex] + next[target];
      let newRow = next[rowIndex] + (target > rowIndex ? deltaPercent : -deltaPercent);
      let newTarget = next[target] - (target > rowIndex ? deltaPercent : -deltaPercent);

      if (newRow < minSize) {
        newRow = minSize;
        newTarget = sum - minSize;
      } else if (newTarget < minSize) {
        newTarget = minSize;
        newRow = sum - minSize;
      }

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
      {/* Grid container — always keeps the full layout so webviews are never destroyed */}
      <div
        className="w-full h-full relative"
        style={{
          display: "grid",
          gridTemplateColumns: colSizes.map((s) => `${s}%`).join(" "),
          gridTemplateRows: rowSizes.map((s) => `${s}%`).join(" "),
          gap: 0,
        }}
      >
        {activeAccountsInWorkspace.map((account, index) => {
          const col = (index % cols) + 1;
          const row = Math.floor(index / cols) + 1;
          const isLastCol = col === cols;
          const isLastRow = row === rows;

          const isThisMaximized = isMaximizedMode && account.id === maximizedId;
          // In single-panel mode (not maximized), only show the first account
          const isHiddenBySingleMode = !isMaximizedMode && gridLayout === "single" && index !== 0;
          // In maximized mode, hide non-maximized panels using visibility:hidden
          // (NOT display:none — that would kill the Electron webview process)
          const isHiddenByMaximize = isMaximizedMode && !isThisMaximized;

          return (
            <div
              key={account.id}
              className="relative p-0.5"
              style={isThisMaximized ? {
                // Maximized panel: overlay the entire grid container absolutely
                position: "absolute",
                inset: 0,
                zIndex: 20,
                padding: "2px",
              } : {
                gridColumn: `${col} / span 1`,
                gridRow: `${row} / span 1`,
                // Use visibility:hidden so webview processes stay alive
                visibility: (isHiddenBySingleMode || isHiddenByMaximize) ? "hidden" : "visible",
                pointerEvents: (isHiddenBySingleMode || isHiddenByMaximize) ? "none" : "auto",
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
                onContextMenu={(e) => {
                  setPanelContextMenu({ x: e.clientX, y: e.clientY, accountId: account.id });
                  setIsOverlayOpen(true);
                }}
              />
              {/* Resize handles — only when not maximized and this panel is visible */}
              {!isMaximizedMode && !isHiddenBySingleMode && !isLastCol && (
                <ResizeHandle
                  direction="horizontal"
                  onDrag={(d) => handleColDrag(col - 1, d)}
                  onReset={resetSizes}
                />
              )}
              {!isMaximizedMode && !isHiddenBySingleMode && !isLastRow && (
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
      
      <AnimatePresence>
        {panelContextMenu && (
          <ContextMenu
            x={panelContextMenu.x}
            y={panelContextMenu.y}
            onClose={() => {
              setPanelContextMenu(null);
              setIsOverlayOpen(false);
            }}
            items={[
              {
                label: "Redirecionar URL",
                icon: <Navigation size={12} />,
                onClick: () => {
                  const store = useAppStore.getState();
                  const targetIds = store.selectedAccountIds.includes(panelContextMenu.accountId)
                    ? store.selectedAccountIds
                    : [panelContextMenu.accountId];
                  openDialog({ type: "navigate-panel", accountIds: targetIds });
                },
              },
              {
                label: "Randomizar Fingerprint",
                icon: <Fingerprint size={12} />,
                onClick: () => {
                  const agents = [
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
                  ];
                  const store = useAppStore.getState();
                  const targetIds = store.selectedAccountIds.includes(panelContextMenu.accountId)
                    ? store.selectedAccountIds
                    : [panelContextMenu.accountId];
                  
                  targetIds.forEach(id => {
                    const randomUA = agents[Math.floor(Math.random() * agents.length)];
                    updateAccount(id, { userAgent: randomUA });
                    const wv = document.querySelector(`webview[partition="persist:panel-${id}"]`) as any;
                    if (wv) {
                      wv.useragent = randomUA;
                      wv.reload();
                    }
                  });
                },
              }
            ]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

