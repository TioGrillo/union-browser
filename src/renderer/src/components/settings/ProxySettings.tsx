import { useState, useRef } from "react";
import {
  Globe,
  Upload,
  Trash2,
  Plus,
  Check,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { parseProxyString, proxyToString, ProxyConfig } from "@/types/index";
import { invoke } from "@/lib/ipc";
import { cn } from "@/lib/utils";

interface ParsedProxy {
  raw: string;
  parsed: ProxyConfig | null;
}

function parseProxyList(text: string): ParsedProxy[] {
  const lines = text
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("//"));

  return lines.map((line) => ({
    raw: line,
    parsed: parseProxyString(line),
  }));
}

export function ProxySettings() {
  const accounts = useAppStore((s) => s.accounts);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);

  const [proxies, setProxies] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [assignTarget, setAssignTarget] = useState<"account" | "workspace">("account");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleImportTxt = async () => {
    const content = await invoke<string | null>("system:open-file", [
      { name: "Text Files", extensions: ["txt", "csv", "list"] },
    ]);
    if (!content) return;
    const parsed = parseProxyList(content);
    const valid = parsed.filter((p) => p.parsed);
    const invalid = parsed.filter((p) => !p.parsed);

    const newProxies = valid.map((p) => p.raw);
    setProxies((prev) => [...prev, ...newProxies]);

    if (invalid.length > 0) {
      showFeedback("error", `${newProxies.length} válidas, ${invalid.length} inválidas ignoradas`);
    } else {
      showFeedback("success", `${newProxies.length} proxy(ies) importadas`);
    }
  };

  const handleAddManual = () => {
    if (!manualInput.trim()) return;
    const parsed = parseProxyString(manualInput);
    if (!parsed) {
      showFeedback("error", "Formato inválido. Use: host:port ou protocol://user:pass@host:port");
      return;
    }
    setProxies((prev) => [...prev, manualInput.trim()]);
    setManualInput("");
    showFeedback("success", "Proxy adicionada");
  };

  const handleRemoveProxy = (index: number) => {
    setProxies((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setProxies([]);
    showFeedback("success", "Lista limpa");
  };

  const handleAssignProxy = async (proxyRaw: string) => {
    const parsed = parseProxyString(proxyRaw);
    if (!parsed) {
      showFeedback("error", "Proxy inválida");
      return;
    }
    const electronProxy = `${parsed.protocol}://${parsed.host}:${parsed.port}`;

    if (assignTarget === "workspace" && activeWorkspaceId) {
      const wsAccounts = accounts.filter((a) => a.workspaceId === activeWorkspaceId);
      for (const acc of wsAccounts) {
        await invoke("panels:set-proxy", acc.id, electronProxy);
        updateAccount(acc.id, { proxy: electronProxy });
      }
      showFeedback("success", `Proxy aplicada em ${wsAccounts.length} contas do workspace`);
    } else if (assignTarget === "account" && selectedAccountId) {
      await invoke("panels:set-proxy", selectedAccountId, electronProxy);
      updateAccount(selectedAccountId, { proxy: electronProxy });
      showFeedback("success", "Proxy aplicada na conta");
    } else {
      showFeedback("error", "Selecione um alvo");
    }
  };

  const handleRemoveProxyFromAccount = async (accountId: string) => {
    await invoke("panels:set-proxy", accountId, null);
    updateAccount(accountId, { proxy: undefined });
    showFeedback("success", "Proxy removida da conta");
  };

  const accountsWithProxy = accounts.filter((a) => a.proxy);

  return (
    <div className="space-y-5">
      {/* Feedback */}
      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium animate-fade-in",
            feedback.type === "success"
              ? "bg-[rgb(var(--success)/0.1)] border border-[rgb(var(--success)/0.2)] text-[rgb(var(--success))]"
              : "bg-[rgb(var(--danger)/0.1)] border border-[rgb(var(--danger)/0.2)] text-[rgb(var(--danger))]"
          )}
        >
          {feedback.type === "success" ? <Check size={12} /> : <AlertTriangle size={12} />}
          {feedback.message}
        </div>
      )}

      {/* Import Section */}
      <div>
        <h3 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">
          Importar Proxies
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleImportTxt}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgb(var(--bg-overlay)/0.3)] border border-[rgb(var(--border)/0.5)] text-[rgb(var(--text-secondary))] text-xs font-medium hover:border-[rgb(var(--accent)/0.5)] hover:text-[rgb(var(--accent))] transition-all"
          >
            <Upload size={12} />
            Importar .txt
          </button>
          <button
            onClick={handleClearAll}
            disabled={proxies.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgb(var(--danger)/0.05)] border border-[rgb(var(--danger)/0.15)] text-[rgb(var(--danger))] text-xs font-medium hover:bg-[rgb(var(--danger)/0.1)] transition-all disabled:opacity-40"
          >
            <Trash2 size={12} />
            Limpar lista
          </button>
        </div>
        <p className="text-[10px] text-[rgb(var(--text-faint))] mt-1.5">
          Formatos aceitos: <code className="text-[rgb(var(--accent))]">host:port</code>,{" "}
          <code className="text-[rgb(var(--accent))]">user:pass@host:port</code>,{" "}
          <code className="text-[rgb(var(--accent))]">socks5://host:port</code>
        </p>
      </div>

      {/* Manual Input */}
      <div>
        <h3 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">
          Adicionar Manualmente
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
            placeholder="127.0.0.1:8080 ou user:pass@host:port"
            className="flex-1 px-3 py-2 bg-[rgb(var(--bg-overlay))] border border-[rgb(var(--border))] rounded-xl text-xs text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] font-mono"
          />
          <button
            onClick={handleAddManual}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgb(var(--accent)/0.1)] border border-[rgb(var(--accent)/0.2)] text-[rgb(var(--accent))] text-xs font-medium hover:bg-[rgb(var(--accent)/0.15)] transition-all"
          >
            <Plus size={12} />
            Adicionar
          </button>
        </div>
      </div>

      {/* Proxy List */}
      {proxies.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">
              Lista ({proxies.length})
            </h3>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-[rgb(var(--bg-overlay)/0.2)] rounded-xl border border-[rgb(var(--border)/0.3)]">
            {proxies.map((proxy, i) => {
              const parsed = parseProxyString(proxy);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[rgb(var(--bg-elevated)/0.5)] group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe size={10} className={parsed ? "text-[rgb(var(--success))]" : "text-[rgb(var(--danger))]"} />
                    <span className="text-[11px] font-mono text-[rgb(var(--text-secondary))] truncate">
                      {proxy}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(proxy);
                        showFeedback("success", "Copiada!");
                      }}
                      className="p-1 rounded text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))]"
                    >
                      <Copy size={10} />
                    </button>
                    <button
                      onClick={() => handleRemoveProxy(i)}
                      className="p-1 rounded text-[rgb(var(--text-faint))] hover:text-[rgb(var(--danger))]"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assign Section */}
      <div>
        <h3 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">
          Atribuir Proxy
        </h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setAssignTarget("account")}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-colors border",
              assignTarget === "account"
                ? "bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent))] border-[rgb(var(--accent)/0.3)]"
                : "text-[rgb(var(--text-faint))] border-[rgb(var(--border)/0.3)] hover:text-[rgb(var(--text-muted))]"
            )}
          >
            Por Conta
          </button>
          <button
            onClick={() => setAssignTarget("workspace")}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-colors border",
              assignTarget === "workspace"
                ? "bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--accent))] border-[rgb(var(--accent)/0.3)]"
                : "text-[rgb(var(--text-faint))] border-[rgb(var(--border)/0.3)] hover:text-[rgb(var(--text-muted))]"
            )}
          >
            Por Workspace
          </button>
        </div>

        {assignTarget === "account" && (
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 bg-[rgb(var(--bg-overlay))] border border-[rgb(var(--border))] rounded-xl text-xs text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]"
          >
            <option value="">Selecione uma conta...</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.proxy ? "(com proxy)" : ""}
              </option>
            ))}
          </select>
        )}

        {assignTarget === "workspace" && (
          <p className="text-[11px] text-[rgb(var(--text-muted))]">
            Será aplicada a todas as contas do workspace atual.
          </p>
        )}
      </div>

      {/* Currently assigned proxies */}
      {accountsWithProxy.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-2">
            Proxies Ativas
          </h3>
          <div className="space-y-1">
            {accountsWithProxy.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[rgb(var(--bg-overlay)/0.2)] border border-[rgb(var(--border)/0.2)]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full" style={{ background: acc.color }} />
                  <span className="text-[11px] font-medium text-[rgb(var(--text-primary))] truncate">
                    {acc.name}
                  </span>
                  <span className="text-[10px] font-mono text-[rgb(var(--text-faint))] truncate">
                    {acc.proxy}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveProxyFromAccount(acc.id)}
                  className="p-1 rounded text-[rgb(var(--text-faint))] hover:text-[rgb(var(--danger))] transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
