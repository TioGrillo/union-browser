import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, RotateCw, VolumeX, Volume2, HelpCircle, Download, LayoutGrid, Maximize2, Minimize2, Settings, Home, Search, Columns, Rows, Square, Maximize, Grid, ZoomIn } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useDialogStore } from "@/stores/dialogStore";
import { send } from "@/lib/ipc";
import { cn } from "@/lib/utils";

export function GlobalToolbar() {
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const accounts = useAppStore((s) => s.accounts);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const selectedAccountIds = useAppStore((s) => s.selectedAccountIds);
  const panelStates = useAppStore((s) => s.panelStates);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const openDialog = useDialogStore((s) => s.open);

  const workspaceAccounts = accounts.filter((a) => a.workspaceId === activeWorkspaceId);
  const activeAccount = workspaceAccounts.find((a) => a.id === activeAccountId);
  const activePanelState = activeAccountId ? panelStates[activeAccountId] : null;

  const [inputUrl, setInputUrl] = useState("https://poke.idleworld.online/login");
  const [isAllMuted, setIsAllMuted] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
  
  const gridLayout = useAppStore((s) => s.gridLayout);
  const setGridLayout = useAppStore((s) => s.setGridLayout);
  const setIsOverlayOpen = useAppStore((s) => s.setIsOverlayOpen);
  const maximizedId = useAppStore((s) => s.maximizedId);
  const setMaximizedId = useAppStore((s) => s.setMaximizedId);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setLayoutMenuOpen(false);
      setDownloadMenuOpen(false);
      setZoomMenuOpen(false);
      setIsOverlayOpen(false);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
    };
  }, []);

  // Sync address bar inputUrl with active panel URL
  useEffect(() => {
    if (activePanelState?.url) {
      setInputUrl(activePanelState.url);
    } else if (activeAccount?.url) {
      setInputUrl(activeAccount.url);
    }
  }, [activePanelState?.url, activeAccount?.url]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || selectedAccountIds.length === 0) return;
    selectedAccountIds.forEach((id) => {
      if (useAppStore.getState().panelStates[id]) {
        useAppStore.getState().navigatePanel(id, inputUrl);
      }
    });
  };

  const handleNavigateAll = () => {
    if (!inputUrl.trim()) return;
    workspaceAccounts.forEach((acc) => {
      if (panelStates[acc.id]) {
        useAppStore.getState().navigatePanel(acc.id, inputUrl);
      }
    });
  };

  const handleRefreshAll = () => {
    workspaceAccounts.forEach((acc) => {
      if (panelStates[acc.id]) {
        send("panels:reload", acc.id);
      }
    });
  };

  const handleMuteAll = () => {
    const nextMute = !isAllMuted;
    setIsAllMuted(nextMute);
    workspaceAccounts.forEach((acc) => {
      if (panelStates[acc.id]) {
        send("panels:mute", acc.id, nextMute);
      }
    });
  };

  const handleMuteToggle = () => {
    if (activeAccountId) {
      const isMuted = !activePanelState?.isMuted;
      send("panels:mute", activeAccountId, isMuted);
    }
  };

  const handleLayoutClick = () => {
    setLayoutMenuOpen(!layoutMenuOpen);
    setDownloadMenuOpen(false);
    setZoomMenuOpen(false);
    setIsOverlayOpen(!layoutMenuOpen);
  };

  const handleZoomClick = (factor: number, all: boolean) => {
    setZoomMenuOpen(false);
    setIsOverlayOpen(false);
    
    const targetIds = all ? workspaceAccounts.map(a => a.id) : (selectedAccountIds.length > 0 ? selectedAccountIds : (activeAccountId ? [activeAccountId] : []));
    
    targetIds.forEach(id => {
      if (panelStates[id]) {
        window.dispatchEvent(new CustomEvent(`panel:zoom:${id}`, { detail: factor }));
      }
    });
  };

  const dispatchPanelAction = (e: React.MouseEvent, action: string, payload?: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If multiple accounts are selected, apply to all selected tabs. Otherwise, apply to active tab only.
    const targets = selectedAccountIds.length > 0 
      ? selectedAccountIds 
      : (activeAccountId ? [activeAccountId] : []);
      
    targets.forEach((id) => {
      if (action === 'navigate') {
        const url = payload || accounts.find(a => a.id === id)?.url || "https://google.com";
        window.dispatchEvent(new CustomEvent(`panel:navigate:${id}`, { detail: { url } }));
      } else {
        window.dispatchEvent(new CustomEvent(`panel:${action}:${id}`, { detail: payload }));
      }
    });
  };

  return (
    <div className={cn(
      "h-10 bg-[rgb(var(--bg-base))] border-b border-[rgb(var(--border)/0.4)] flex items-center gap-1.5 px-3 select-none shrink-0 no-drag transition-all duration-300",
      sidebarCollapsed && "pl-12"
    )}>
      {/* Mini Controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={(e) => dispatchPanelAction(e, "back")}
          disabled={!activePanelState?.canGoBack}
          title="Voltar (Segure CTRL para todas selecionadas)"
          className="p-1.5 rounded-lg text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)] disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ArrowLeft size={13} />
        </button>
        <button
          onClick={(e) => dispatchPanelAction(e, "forward")}
          disabled={!activePanelState?.canGoForward}
          title="Avançar (Segure CTRL para todas selecionadas)"
          className="p-1.5 rounded-lg text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)] disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ArrowRight size={13} />
        </button>
        <button
          onClick={(e) => dispatchPanelAction(e, "reload")}
          title="Recarregar aba atual (Segure CTRL para todas selecionadas)"
          className="p-1.5 rounded-lg text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)]"
        >
          <RotateCw size={12} />
        </button>
        <button
          onClick={(e) => dispatchPanelAction(e, "navigate")}
          title="Início (Segure CTRL para todas selecionadas)"
          className="p-1.5 rounded-lg text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)]"
        >
          <Home size={12} />
        </button>
      </div>

      {/* Address Bar */}
      <form onSubmit={handleNavigate} className="flex-1 max-w-lg mx-auto flex items-center relative group">
        <div className="absolute left-3 text-[rgb(var(--text-faint))] group-focus-within:text-accent transition-colors">
          <Search size={11} />
        </div>
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder={selectedAccountIds.length > 1 ? `Navegar em ${selectedAccountIds.length} contas selecionadas...` : selectedAccountIds.length === 1 ? "Digite uma URL e tecle Enter..." : "Selecione uma conta para navegar..."}
          disabled={selectedAccountIds.length === 0}
          className="w-full bg-[rgb(var(--bg-surface))] text-xs text-[rgb(var(--text-secondary))] placeholder:text-[rgb(var(--text-faint))] rounded-lg py-1.5 pl-7.5 pr-8 border border-surface-900 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15 transition-all text-center font-mono disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleNavigateAll}
          title="Abrir URL em todas as contas"
          className="absolute right-1.5 p-1 rounded-md text-[rgb(var(--text-faint))] hover:text-accent hover:bg-accent/10 transition-colors"
        >
          <Grid size={13} />
        </button>
      </form>

      {/* Global Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleRefreshAll}
          title="Recarregar todas as contas online"
          className="p-1.5 rounded-lg text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)] transition-colors"
        >
          <RotateCw size={13} className="text-[rgb(var(--text-muted))]" />
        </button>

        <button
          onClick={() => {
            setIsAllMuted(false);
            workspaceAccounts.forEach((acc) => panelStates[acc.id] && send("panels:mute", acc.id, false));
          }}
          title="Ativar som de todas"
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            !isAllMuted ? "bg-[rgb(var(--border))] text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)]"
          )}
        >
          <Volume2 size={13} />
        </button>

        <button
          onClick={() => {
            setIsAllMuted(true);
            workspaceAccounts.forEach((acc) => panelStates[acc.id] && send("panels:mute", acc.id, true));
          }}
          title="Silenciar todas"
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            isAllMuted ? "bg-[rgb(var(--border))] text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)]"
          )}
        >
          <VolumeX size={13} />
        </button>

        {/* Zoom Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextState = !zoomMenuOpen;
              setLayoutMenuOpen(false);
              setDownloadMenuOpen(false);
              setZoomMenuOpen(nextState);
              setIsOverlayOpen(nextState);
            }}
            title="Zoom"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              zoomMenuOpen ? "bg-accent/10 text-accent" : "text-[rgb(var(--text-faint))] hover:text-accent hover:bg-[rgb(var(--border)/0.5)]"
            )}
          >
            <ZoomIn size={13} className={zoomMenuOpen ? "text-accent" : ""} />
          </button>
          
          {zoomMenuOpen && (
            <div 
              className="absolute top-full right-0 mt-2 w-48 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl shadow-xl overflow-hidden z-50 flex flex-col py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { factor: 0.5, label: "50%" },
                { factor: 0.75, label: "75%" },
                { factor: 1.0, label: "100%" },
                { factor: 1.25, label: "125%" },
                { factor: 1.5, label: "150%" },
                { factor: 1.75, label: "175%" },
                { factor: 2.0, label: "200%" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleZoomClick(item.factor, false)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-xs transition-colors hover:bg-[rgb(var(--border))] font-medium",
                    activePanelState?.zoom === Math.round(item.factor * 100)
                      ? "text-accent"
                      : "text-[rgb(var(--text-secondary))] hover:text-surface-100"
                  )}
                >
                  {item.label}
                </button>
              ))}
              
              <div className="h-[1px] bg-[rgb(var(--border)/0.5)] my-1" />
              
              <button
                onClick={() => handleZoomClick(activePanelState ? activePanelState.zoom / 100 : 1, true)}
                className="w-full text-left px-4 py-2.5 text-xs text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--border))] hover:text-surface-100 transition-colors font-medium"
              >
                Aplicar a todas
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-[rgb(var(--border))] mx-1" />

        {/* Layout Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLayoutClick();
            }}
            title="Layout"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              layoutMenuOpen ? "bg-accent/10 text-accent" : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)]"
            )}
          >
            <LayoutGrid size={13} className={layoutMenuOpen ? "text-accent" : ""} />
          </button>
          
          {layoutMenuOpen && (
            <div 
              className="absolute top-full right-0 mt-2 w-48 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl shadow-xl overflow-hidden z-50 flex flex-col py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { id: "auto", label: "Grade automática", icon: <LayoutGrid size={13} /> },
                { id: "single", label: "Painel único", icon: <Square size={13} /> },
                { id: "columns", label: "Colunas", icon: <Columns size={13} /> },
                { id: "rows", label: "Linhas", icon: <Rows size={13} /> },
                { id: "free", label: "Livre", icon: <Maximize size={13} /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setGridLayout(item.id as any);
                    setLayoutMenuOpen(false);
                    setIsOverlayOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-xs transition-colors",
                    gridLayout === item.id ? "text-accent bg-accent/5" : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--border))] hover:text-surface-100"
                  )}
                >
                  <div className={gridLayout === item.id ? "text-accent" : "text-[rgb(var(--text-faint))]"}>
                    {item.icon}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Downloads Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextState = !downloadMenuOpen;
              setLayoutMenuOpen(false);
              setDownloadMenuOpen(nextState);
              setIsOverlayOpen(nextState);
            }}
            title="Downloads"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              downloadMenuOpen ? "bg-[rgb(var(--border))] text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)]"
            )}
          >
            <Download size={13} />
          </button>
          
          {downloadMenuOpen && (
            <div 
              className="absolute top-full right-0 mt-2 w-56 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl shadow-xl overflow-hidden z-50 flex flex-col p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-[10px] font-bold text-[rgb(var(--text-muted))] mb-2">DOWNLOADS</h4>
              <p className="text-xs text-[rgb(var(--text-faint))]">Nenhum download nesta sessão</p>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (activeAccountId) {
              setMaximizedId(maximizedId === activeAccountId ? null : activeAccountId);
            }
          }}
          title={maximizedId === activeAccountId ? "Restaurar layout" : "Maximizar aba ativa"}
          disabled={!activeAccountId}
          className="p-1.5 rounded-lg text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          {maximizedId === activeAccountId ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>

        <button
          onClick={() => openDialog({ type: "settings" })}
          title="Configurações"
          className="p-1.5 rounded-lg text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)] transition-colors"
        >
          <Settings size={13} />
        </button>

        <button
          onClick={() => openDialog({ type: "keyboard-shortcuts" })}
          title="Atalhos de teclado"
          className="p-1.5 rounded-lg text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)] transition-colors"
        >
          <HelpCircle size={13} />
        </button>
      </div>
    </div>
  );
}
