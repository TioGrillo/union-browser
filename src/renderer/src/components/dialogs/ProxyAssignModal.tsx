import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/stores/appStore";
import { useDialogStore } from "@/stores/dialogStore";
import { invoke } from "@/lib/ipc";
import { parseProxyString } from "@/types/index";
import { Globe, Plus, Trash2, Check, AlertTriangle, Shuffle, Upload } from "lucide-react";

export function ProxyAssignModal({ onClose, accountIds }: { onClose: () => void; accountIds: string[] }) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const accounts = useAppStore((s) => s.accounts);

  const proxies = settings.proxies || [];
  const [newProxy, setNewProxy] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const getElectronProxyString = (rawProxy: string) => {
    const parsed = parseProxyString(rawProxy);
    if (!parsed) return null;
    let electronProxy = `${parsed.protocol}://`;
    if (parsed.username) {
      electronProxy += encodeURIComponent(parsed.username);
      if (parsed.password) electronProxy += `:${encodeURIComponent(parsed.password)}`;
      electronProxy += "@";
    }
    electronProxy += `${parsed.host}:${parsed.port}`;
    return electronProxy;
  };

  const assignProxy = async (accountId: string, proxyRaw: string | null) => {
    if (!proxyRaw) {
      await invoke("panels:set-proxy", accountId, null);
      updateAccount(accountId, { proxy: undefined });
      return;
    }
    const electronProxy = getElectronProxyString(proxyRaw);
    if (!electronProxy) return;
    await invoke("panels:set-proxy", accountId, electronProxy);
    updateAccount(accountId, { proxy: electronProxy });
  };

  const handleAssignSingle = async (proxyRaw: string) => {
    for (const id of accountIds) {
      await assignProxy(id, proxyRaw);
    }
    showFeedback("success", `Proxy aplicada em ${accountIds.length} conta(s)`);
    setTimeout(onClose, 1000);
  };

  const handleDistribute = async () => {
    if (proxies.length === 0) return;
    for (let i = 0; i < accountIds.length; i++) {
      const proxy = proxies[i % proxies.length];
      await assignProxy(accountIds[i], proxy);
    }
    showFeedback("success", `Proxies distribuídas em ${accountIds.length} conta(s)`);
    setTimeout(onClose, 1000);
  };

  const handleRemoveAll = async () => {
    for (const id of accountIds) {
      await assignProxy(id, null);
    }
    showFeedback("success", "Proxies removidas");
    setTimeout(onClose, 1000);
  };

  const handleAddProxy = () => {
    const lines = newProxy.split(/[\r\n]+/).map(l => l.trim()).filter(l => !!l);
    const valid = lines.filter(l => parseProxyString(l) !== null);
    if (valid.length === 0) {
      showFeedback("error", "Nenhuma proxy válida encontrada");
      return;
    }
    updateSettings({ proxies: [...proxies, ...valid] });
    setNewProxy("");
    showFeedback("success", `${valid.length} proxy(ies) adicionada(s)`);
  };

  const handleImportTxt = async () => {
    const content = await invoke<string | null>("system:open-file", [
      { name: "Text Files", extensions: ["txt", "csv", "list"] },
    ]);
    if (!content) return;
    
    const lines = content.split(/[\r\n]+/).map(l => l.trim()).filter(l => !!l);
    const valid = lines.filter(l => parseProxyString(l) !== null);
    if (valid.length === 0) {
      showFeedback("error", "Nenhuma proxy válida encontrada no arquivo");
      return;
    }
    updateSettings({ proxies: [...proxies, ...valid] });
    showFeedback("success", `${valid.length} proxy(ies) importada(s) do arquivo`);
  };

  const removeProxyFromList = (index: number) => {
    updateSettings({ proxies: proxies.filter((_, i) => i !== index) });
  };

  return (
    <Modal open onClose={onClose} title={`Configurar Proxy (${accountIds.length} contas)`} maxWidth="max-w-2xl">
      <div className="flex w-[600px] h-[400px] -mx-4 -mb-4 border-t border-[rgb(var(--border)/0.5)] bg-[rgb(var(--bg-deep))]">
        <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
          {feedback && (
            <div className={`p-3 rounded-xl border flex items-center gap-3 ${
              feedback.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                : "bg-red-500/10 border-red-500/20 text-red-500"
            }`}>
              {feedback.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
              <span className="text-sm font-medium">{feedback.message}</span>
            </div>
          )}

          {proxies.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-6 text-[rgb(var(--text-faint))]">
              <Globe size={48} className="mb-4 opacity-20" />
              <p className="text-sm mb-2">Você ainda não tem proxies salvas.</p>
              <p className="text-xs max-w-xs mb-6">Adicione uma lista de proxies abaixo para poder atribuí-las às suas contas.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[rgb(var(--text-primary))]">Proxies Salvas</span>
                {accountIds.length > 1 && (
                  <Button variant="ghost" className="text-accent border border-accent/30 hover:bg-accent/10 h-8 text-xs gap-2" onClick={handleDistribute}>
                    <Shuffle size={14} />
                    Distribuir 1 para cada
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {proxies.map((proxy, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))] hover:border-accent/50 transition-colors group">
                    <span className="text-xs font-mono text-[rgb(var(--text-secondary))] truncate flex-1">{proxy}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => removeProxyFromList(i)} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Remover da lista">
                        <Trash2 size={12} />
                      </button>
                      <button onClick={() => handleAssignSingle(proxy)} className="p-1.5 rounded bg-accent text-white hover:bg-accent/90" title="Aplicar às contas selecionadas">
                        <Check size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="danger" className="w-full" onClick={handleRemoveAll}>
                  Remover proxy das contas
                </Button>
              </div>
            </div>
          )}

          <div className="mt-auto border-t border-[rgb(var(--border)/0.5)] pt-4 space-y-2">
            <span className="text-xs font-medium text-[rgb(var(--text-muted))]">Adicionar novas proxies</span>
            <div className="flex gap-2">
              <textarea
                value={newProxy}
                onChange={(e) => setNewProxy(e.target.value)}
                placeholder="Cole aqui (uma por linha)&#10;host:port ou protocolo://user:pass@host:port"
                className="flex-1 h-20 px-3 py-2 bg-[rgb(var(--bg-overlay))] border border-[rgb(var(--border))] rounded-xl text-xs text-[rgb(var(--text-primary))] focus:border-accent outline-none font-mono resize-none custom-scrollbar"
              />
              <div className="flex flex-col gap-2">
                <Button onClick={handleAddProxy} className="h-9 px-4 flex items-center justify-center gap-1">
                  <Plus size={14} />
                  <span>Salvar</span>
                </Button>
                <Button variant="ghost" onClick={handleImportTxt} className="h-9 px-4 flex items-center justify-center gap-1 border border-[rgb(var(--border))]">
                  <Upload size={14} />
                  <span>Importar .txt</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
