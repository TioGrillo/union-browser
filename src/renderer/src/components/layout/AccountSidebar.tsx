import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Play, Square, Pencil, Trash2, Power, Settings, RefreshCw, Home, VolumeX, Copy, Eraser, Globe, Eye } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useMirrorStore } from "@/stores/mirrorStore";
import { useDialogStore } from "@/stores/dialogStore";
import { invoke, send } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import { ContextMenu } from "./Sidebar";
import { AnimatePresence } from "framer-motion";

export function AccountSidebar() {
  const { t } = useTranslation();
  const workspaces = useAppStore((s) => s.workspaces);
  const accounts = useAppStore((s) => s.accounts);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const setActiveAccountId = useAppStore((s) => s.setActiveAccountId);
  const selectedAccountIds = useAppStore((s) => s.selectedAccountIds);
  const setSelectedAccountIds = useAppStore((s) => s.setSelectedAccountIds);
  const panelStates = useAppStore((s) => s.panelStates);
  const mountPanel = useAppStore((s) => s.mountPanel);
  const unmountPanel = useAppStore((s) => s.unmountPanel);
  const openDialog = useDialogStore((s) => s.open);

  const [uptimes, setUptimes] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState<Record<number, { cpu: number; ram: number }>>({});
  const [contextMenu, setContextMenu] = useState<{ accountId: string; x: number; y: number } | null>(null);
  const setIsOverlayOpen = useAppStore((s) => s.setIsOverlayOpen);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const masterAccountId = useMirrorStore((s) => s.masterAccountId);
  const setMaster = useMirrorStore((s) => s.setMaster);
  const clearMaster = useMirrorStore((s) => s.clearMaster);
  const [proxyDialogTargets, setProxyDialogTargets] = useState<string[]>([]);
  const [proxyInput, setProxyInput] = useState("");

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const workspaceAccounts = accounts.filter((a) => a.workspaceId === activeWorkspaceId);

  // Increment uptimes of online panels every second, and fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const sysMetrics = await invoke<{ wcMetrics: Record<number, { cpu: number; ram: number }> }>("system:metrics");
        if (sysMetrics && sysMetrics.wcMetrics) {
          setMetrics(sysMetrics.wcMetrics);
        }
      } catch (e) {
        console.error("Failed to fetch metrics", e);
      }
    };

    const timer = setInterval(() => {
      setUptimes((prev) => {
        const next = { ...prev };
        workspaceAccounts.forEach((acc) => {
          const isOnline = !!panelStates[acc.id];
          if (isOnline) {
            next[acc.id] = (next[acc.id] || 0) + 1;
          } else {
            delete next[acc.id];
          }
        });
        return next;
      });
      fetchMetrics();
    }, 1000);
    return () => clearInterval(timer);
  }, [workspaceAccounts, panelStates]);

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const handleToggleAccount = async (accountId: string, url: string, isOnline: boolean) => {
    if (isOnline) {
      // Unmount
      await unmountPanel(accountId);
      if (activeAccountId === accountId) {
        setActiveAccountId(null);
      }
    } else {
      // Mount
      await mountPanel(accountId, url);
      setActiveAccountId(accountId);
    }
  };

  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  if (!activeWorkspace) return null;

  return (
    <div
      className={cn(
        "bg-[rgb(var(--bg-surface))] border-r border-[rgb(var(--border))] h-full flex flex-col shrink-0 select-none transition-all duration-300 overflow-hidden origin-top-left",
        sidebarCollapsed ? "w-0 opacity-0 -translate-y-full border-r-0" : "w-[220px] opacity-100 translate-y-0"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b border-[rgb(var(--border)/0.3)]">
        <span className="text-xs font-bold text-[rgb(var(--text-primary))] truncate uppercase tracking-wider flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeWorkspace.color }} />
          {activeWorkspace.name}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openDialog({ type: "edit-workspace", workspaceId: activeWorkspace.id })}
            className="p-1 rounded text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--border))] transition-all"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => openDialog({ type: "delete-workspace", workspaceId: activeWorkspace.id })}
            className="p-1 rounded text-[rgb(var(--text-faint))] hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Account Cards list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {workspaceAccounts.map((acc) => {
          const pState = panelStates[acc.id];
          const isOnline = !!pState;
          const isActive = acc.id === activeAccountId;
          const panelMetrics = pState?.wcId ? metrics[pState.wcId] : undefined;
          const uptime = uptimes[acc.id] || 0;

          return (
            <div
              key={acc.id}
              onClick={(e) => {
                if (isOnline) {
                  if (e.shiftKey) {
                    const lastSelected = selectedAccountIds[selectedAccountIds.length - 1];
                    const onlineAccounts = workspaceAccounts.filter(a => !!panelStates[a.id]);
                    const lastIndex = onlineAccounts.findIndex(a => a.id === lastSelected);
                    const currentIndex = onlineAccounts.findIndex(a => a.id === acc.id);
                    if (lastIndex !== -1 && currentIndex !== -1) {
                      const start = Math.min(lastIndex, currentIndex);
                      const end = Math.max(lastIndex, currentIndex);
                      const idsToSelect = onlineAccounts.slice(start, end + 1).map(a => a.id);
                      setSelectedAccountIds(idsToSelect);
                      setActiveAccountId(acc.id);
                    } else {
                      setSelectedAccountIds([acc.id]);
                      setActiveAccountId(acc.id);
                    }
                  } else if (e.ctrlKey || e.metaKey) {
                    if (selectedAccountIds.includes(acc.id)) {
                      const newSelection = selectedAccountIds.filter(id => id !== acc.id);
                      setSelectedAccountIds(newSelection);
                      if (isActive) setActiveAccountId(newSelection.length > 0 ? newSelection[0] : null);
                    } else {
                      setSelectedAccountIds([...selectedAccountIds, acc.id]);
                      setActiveAccountId(acc.id);
                    }
                  } else {
                    setSelectedAccountIds([acc.id]);
                    setActiveAccountId(isActive && selectedAccountIds.length <= 1 ? null : acc.id);
                    if (isActive && selectedAccountIds.length <= 1) {
                      setSelectedAccountIds([]);
                    }
                  }
                } else {
                  handleToggleAccount(acc.id, acc.url, false);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!selectedAccountIds.includes(acc.id)) {
                  setSelectedAccountIds([acc.id]);
                  setActiveAccountId(acc.id);
                }
                setIsOverlayOpen(true);
                setContextMenu({ accountId: acc.id, x: e.clientX, y: e.clientY });
              }}
              className={cn(
                "w-full rounded-xl p-2.5 text-left border cursor-pointer transition-all relative flex flex-col gap-1",
                selectedAccountIds.includes(acc.id)
                  ? "bg-[rgb(var(--bg-elevated))] border-accent/75 shadow-[0_0_8px_rgba(var(--accent),0.1)]"
                  : isOnline
                  ? "bg-[rgb(var(--bg-elevated)/0.4)] border-[rgb(var(--border)/0.4)] hover:bg-[rgb(var(--bg-elevated)/0.6)]"
                  : "bg-transparent border-transparent hover:bg-[rgb(var(--border)/0.2)]"
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: acc.color }}
                  />
                  <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))] truncate">
                    {acc.name}
                  </span>
                </div>

                {/* Power / mount toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleAccount(acc.id, acc.url, isOnline);
                  }}
                  className={cn(
                    "p-1 rounded-md transition-all shrink-0 border border-transparent",
                    isOnline
                      ? "text-green-400 bg-green-500/10 border-green-500/20"
                      : "text-[rgb(var(--text-faint))] hover:text-green-400 hover:bg-green-500/5"
                  )}
                >
                  <Power size={9} />
                </button>
              </div>

              {/* Status details */}
              <div className="flex flex-col gap-0.5 mt-0.5 text-[9px] text-[rgb(var(--text-faint))]">
                {isOnline ? (
                  <>
                    <div className="flex justify-between items-center text-green-400 font-medium">
                      <span>Online</span>
                      {uptime > 0 && <span className="text-[rgb(var(--text-muted))]">{formatUptime(uptime)}</span>}
                    </div>
                    {panelMetrics && (
                      <div className="flex gap-2 text-[rgb(var(--text-faint))] font-mono text-[9px] mt-0.5">
                        <span>CPU {panelMetrics.cpu}%</span>
                        <span>RAM {panelMetrics.ram} MB</span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[rgb(var(--text-faint))] font-medium">Fechada</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Add account */}
      <div className="p-2 shrink-0 border-t border-[rgb(var(--border)/0.3)] flex gap-1 bg-[rgb(var(--bg-base)/0.3)]">
        <button
          onClick={() => openDialog({ type: "create-account", workspaceId: activeWorkspaceId! })}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/15 text-accent text-[11px] font-medium transition-all"
        >
          <Plus size={11} />
          Adicionar conta
        </button>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => {
              setIsOverlayOpen(false);
              setContextMenu(null);
            }}
            items={[
              {
                label: masterAccountId === contextMenu.accountId ? "Desativar espelho" : "Modo espelho (master)",
                icon: <Eye size={12} />,
                onClick: () => {
                  if (masterAccountId === contextMenu.accountId) {
                    clearMaster();
                  } else {
                    setMaster(contextMenu.accountId, activeWorkspaceId);
                  }
                },
              },
              {
                label: "Adicionar proxy",
                icon: <Globe size={12} />,
                onClick: () => {
                  const acc = accounts.find(a => a.id === contextMenu.accountId);
                  setProxyInput(acc?.proxy || "");
                  setProxyDialogTargets(selectedAccountIds);
                },
              },
              {
                label: "Recarregar",
                icon: <RefreshCw size={12} />,
                onClick: () => selectedAccountIds.forEach(id => window.dispatchEvent(new CustomEvent(`panel:reload:${id}`))),
              },
              {
                label: "Ir para a URL padrão",
                icon: <Home size={12} />,
                onClick: () => {
                  selectedAccountIds.forEach(id => {
                    const acc = accounts.find(a => a.id === id);
                    if (acc) window.dispatchEvent(new CustomEvent(`panel:navigate:${id}`, { detail: { url: acc.url } }));
                  });
                },
              },
              {
                label: "Silenciar painel",
                icon: <VolumeX size={12} />,
                onClick: () => selectedAccountIds.forEach(id => window.dispatchEvent(new CustomEvent(`panel:mute:${id}`))),
              },
              {
                label: "Fechar conta",
                icon: <Power size={12} />,
                onClick: () => {
                  selectedAccountIds.forEach(id => {
                    unmountPanel(id);
                  });
                  if (activeAccountId && selectedAccountIds.includes(activeAccountId)) {
                    setActiveAccountId(null);
                  }
                },
              },
              {
                label: "Editar conta",
                icon: <Pencil size={12} />,
                onClick: () => {
                  // Editar opens a dialog, which doesn't really support multiple edits at once nicely.
                  // Defaulting to only edit the clicked one.
                  openDialog({ type: "edit-account", accountId: contextMenu.accountId });
                }
              },
              {
                label: "Duplicar conta",
                icon: <Copy size={12} />,
                onClick: () => {
                  selectedAccountIds.forEach(id => {
                    const acc = accounts.find((a) => a.id === id);
                    if (acc) {
                      useAppStore.getState().createAccount({
                        workspaceId: acc.workspaceId,
                        name: acc.name + " (cópia)",
                        url: acc.url,
                        userAgent: acc.userAgent,
                        proxy: acc.proxy,
                        color: acc.color,
                        icon: acc.icon,
                      });
                    }
                  });
                },
              },
              {
                label: "Limpar dados da sessão",
                icon: <Eraser size={12} />,
                danger: true,
                onClick: () => selectedAccountIds.forEach(id => invoke("session:clear-data", id)),
              },
              {
                label: "Excluir conta",
                icon: <Trash2 size={12} />,
                danger: true,
                onClick: () => openDialog({ type: "delete-account", accountIds: selectedAccountIds }),
              },
            ]}
          />
        )}
      </AnimatePresence>

      {/* Proxy Dialog */}
      {proxyDialogTargets.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProxyDialogTargets([])} />
          <div className="relative bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-2xl shadow-2xl p-5 w-80 animate-scale-in z-[201]">
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">
              Configurar Proxy {proxyDialogTargets.length > 1 ? `(${proxyDialogTargets.length} contas)` : ""}
            </h3>
            <input
              type="text"
              value={proxyInput}
              onChange={(e) => setProxyInput(e.target.value)}
              placeholder="host:port ou protocolo://host:port"
              className="w-full px-3 py-2 bg-[rgb(var(--bg-overlay))] border border-[rgb(var(--border))] rounded-xl text-xs text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] font-mono mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const proxy = proxyInput.trim() || null;
                  proxyDialogTargets.forEach(id => {
                    invoke("panels:set-proxy", id, proxy);
                    updateAccount(id, { proxy: proxy || undefined });
                  });
                  setProxyDialogTargets([]);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  for (const id of proxyDialogTargets) {
                    await invoke("panels:set-proxy", id, null);
                    updateAccount(id, { proxy: undefined });
                  }
                  setProxyDialogTargets([]);
                }}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[rgb(var(--danger)/0.1)] text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.15)] transition-colors"
              >
                Remover
              </button>
              <button
                onClick={async () => {
                  const proxy = proxyInput.trim() || null;
                  for (const id of proxyDialogTargets) {
                    await invoke("panels:set-proxy", id, proxy);
                    updateAccount(id, { proxy: proxy || undefined });
                  }
                  setProxyDialogTargets([]);
                }}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent)/0.15)] transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
