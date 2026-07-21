import { useState, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { invoke } from "@/lib/ipc";
import type { Extension } from "@/types/index";
import { cn } from "@/lib/utils";
import { Puzzle, Upload, FolderOpen, Trash2, Globe, ChevronDown, ChevronUp } from "lucide-react";

export function ExtensionsManager() {
  const settings = useAppStore((s) => s.settings);
  const accounts = useAppStore((s) => s.accounts);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const [extensions, setExtensions] = useState<Extension[]>(settings.extensions || []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const workspaceAccounts = accounts.filter((a) => a.workspaceId === activeWorkspaceId);

  useEffect(() => {
    setExtensions(settings.extensions || []);
  }, [settings.extensions]);

  const showFeedback = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleInstallZip = async () => {
    try {
      const installed = await invoke<Extension[] | null>("extensions:install-zip");
      if (installed && installed.length > 0) {
        showFeedback("success", installed.length + " extensao(oes) instalada(s)");
      }
    } catch (e) {
      showFeedback("error", "Erro ao instalar extensao");
    }
  };

  const handleInstallDirectory = async () => {
    try {
      const ext = await invoke<Extension | null>("extensions:install-directory");
      if (ext) {
        showFeedback("success", ext.name + " instalada");
      }
    } catch (e) {
      showFeedback("error", "Erro ao instalar extensao");
    }
  };

  const handleRemove = async (extId: string) => {
    const ok = await invoke<boolean>("extensions:remove", extId);
    if (ok) showFeedback("success", "Extensao removida");
  };

  const handleToggle = async (extId: string, enabled: boolean) => {
    await invoke("extensions:toggle", extId, enabled);
  };

  const handleToggleGlobal = async (extId: string, enabled: boolean) => {
    await invoke("extensions:set-globally", extId, enabled);
  };

  const handleToggleAccount = async (extId: string, accountId: string, enabled: boolean) => {
    await invoke("extensions:set-account", extId, accountId, enabled);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-lg font-bold text-[rgb(var(--text-primary))]">Extensões</h3>
        <p className="text-xs text-[rgb(var(--text-faint))] mt-1">
          Gerencie extensões Chrome. Instale por .zip ou pasta e atribua a contas específicas.
        </p>
      </div>

      {feedback && (
        <div
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-medium transition-all",
            feedback.type === "success"
              ? "bg-green-500/10 text-green-400 border border-green-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          )}
        >
          {feedback.msg}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleInstallZip}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[rgb(var(--border)/0.4)] bg-[rgb(var(--bg-surface)/0.5)] hover:bg-[rgb(var(--bg-surface)/0.8)] hover:border-accent/30 transition-all text-sm font-medium text-[rgb(var(--text-primary))]"
        >
          <Upload size={16} className="text-accent" />
          Instalar .zip
        </button>
        <button
          onClick={handleInstallDirectory}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[rgb(var(--border)/0.4)] bg-[rgb(var(--bg-surface)/0.5)] hover:bg-[rgb(var(--bg-surface)/0.8)] hover:border-accent/30 transition-all text-sm font-medium text-[rgb(var(--text-primary))]"
        >
          <FolderOpen size={16} className="text-accent" />
          Instalar pasta
        </button>
      </div>

      {extensions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[rgb(var(--border)/0.2)] flex items-center justify-center mb-3">
            <Puzzle size={24} className="text-[rgb(var(--text-faint))]" />
          </div>
          <p className="text-sm text-[rgb(var(--text-muted))] mb-1">Nenhuma extensão instalada</p>
          <p className="text-xs text-[rgb(var(--text-faint))]">
            Instale um .zip ou pasta de extensão Chrome para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {extensions.map((ext) => {
            const isExpanded = expandedId === ext.id;
            return (
              <div
                key={ext.id}
                className={cn(
                  "rounded-xl border transition-all",
                  ext.enabled
                    ? "border-[rgb(var(--border)/0.4)] bg-[rgb(var(--bg-surface)/0.5)]"
                    : "border-[rgb(var(--border)/0.2)] bg-[rgb(var(--bg-surface)/0.2)] opacity-60"
                )}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 rounded-lg bg-[rgb(var(--bg-base)/0.5)] border border-[rgb(var(--border)/0.3)] flex items-center justify-center shrink-0">
                    <Puzzle size={18} className="text-[rgb(var(--text-faint))]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[rgb(var(--text-primary))] truncate">
                        {ext.name}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--text-faint))] bg-[rgb(var(--bg-base)/0.5)] px-1.5 py-0.5 rounded">
                        v{ext.version}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--text-faint))] bg-[rgb(var(--bg-base)/0.5)] px-1.5 py-0.5 rounded">
                        MV{ext.manifestVersion}
                      </span>
                    </div>
                    <p className="text-[11px] text-[rgb(var(--text-faint))] truncate max-w-xs">
                      {ext.description || "Sem descrição"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleGlobal(ext.id, !ext.enabledGlobally)}
                      className={cn(
                        "flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors",
                        ext.enabledGlobally
                          ? "bg-accent/10 text-accent border border-accent/20"
                          : "bg-[rgb(var(--bg-base)/0.5)] text-[rgb(var(--text-faint))] border border-[rgb(var(--border)/0.2)]"
                      )}
                      title="Ativar em todas as contas"
                    >
                      <Globe size={10} />
                      Global
                    </button>

                    <button
                      onClick={() => handleToggle(ext.id, !ext.enabled)}
                      className="relative w-10 h-[22px] rounded-full shrink-0 transition-colors duration-200"
                      style={{
                        backgroundColor: ext.enabled ? "rgb(var(--accent))" : "rgb(var(--border))",
                        opacity: ext.enabled ? 1 : 0.5,
                      }}
                    >
                      <span
                        className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                        style={{ transform: ext.enabled ? "translateX(18px)" : "translateX(0)" }}
                      />
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ext.id)}
                      className="p-1 rounded-md hover:bg-[rgb(var(--border)/0.3)] text-[rgb(var(--text-faint))] transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-[rgb(var(--border)/0.2)]">
                    <p className="text-[10px] text-[rgb(var(--text-faint))] mb-2 font-medium uppercase tracking-wider">
                      Contas com esta extensão
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] text-[rgb(var(--text-faint))]">Chrome Web Store:</span>
                      <a
                        href={"https://chromewebstore.google.com/detail/" + ext.id}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-accent hover:text-accent-light transition-colors truncate max-w-xs"
                      >
                        chromewebstore.google.com/detail/{ext.id.slice(0, 20)}...
                      </a>
                    </div>

                    {workspaceAccounts.length === 0 ? (
                      <p className="text-[11px] text-[rgb(var(--text-faint))]">
                        Nenhuma conta neste workspace.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {workspaceAccounts.map((acc) => {
                          const isAccountEnabled = ext.enabledAccounts.includes(acc.id);
                          return (
                            <div
                              key={acc.id}
                              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[rgb(var(--bg-base)/0.3)]"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: acc.color }}
                                />
                                <span className="text-xs text-[rgb(var(--text-primary))]">{acc.name}</span>
                              </div>
                              <button
                                onClick={() => handleToggleAccount(ext.id, acc.id, !isAccountEnabled)}
                                className={cn(
                                  "text-[10px] px-2 py-1 rounded-md transition-colors",
                                  isAccountEnabled
                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                    : "bg-[rgb(var(--bg-base)/0.5)] text-[rgb(var(--text-faint))] border border-[rgb(var(--border)/0.2)]"
                                )}
                              >
                                {isAccountEnabled ? "Ativa" : "Inativa"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-[rgb(var(--border)/0.2)] flex items-center justify-between">
                      <span className="text-[10px] text-[rgb(var(--text-faint))]">
                        Fonte: {ext.installSource} | {new Date(ext.installedAt).toLocaleDateString("pt-BR")}
                      </span>
                      <button
                        onClick={() => handleRemove(ext.id)}
                        className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
                      >
                        <Trash2 size={10} />
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
