import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDialogStore } from "@/stores/dialogStore";
import { useAppStore } from "@/stores/appStore";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Select } from "@/components/ui/Select";
import { ThemeCustomizer } from "@/components/settings/ThemeCustomizer";
import { ProxySettings } from "@/components/settings/ProxySettings";
import { Globe, Download, RefreshCw, Info, Settings as SettingsIcon, Upload, FolderOpen, Download as DownloadIcon, Palette, Gauge, Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace, Account } from "@/types/index";
import { invoke } from "@/lib/ipc";
import { PerformanceSettings } from "@/components/settings/PerformanceSettings";
import { ExtensionsManager } from "@/components/settings/ExtensionsManager";

function WorkspaceDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dialog = useDialogStore((s) => s.dialog);
  const createWorkspace = useAppStore((s) => s.createWorkspace);
  const updateWorkspace = useAppStore((s) => s.updateWorkspace);
  const workspaces = useAppStore((s) => s.workspaces);

  const isEdit = dialog?.type === "edit-workspace";
  const existing = isEdit ? workspaces.find((w) => w.id === dialog?.workspaceId) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? "#6366f1");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setColor(existing.color);
    }
  }, [existing]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEdit && dialog?.type === "edit-workspace") {
      await updateWorkspace(dialog.workspaceId, { name, color });
    } else {
      await createWorkspace({ name, color, icon: "layers" });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? t("workspace.edit") : t("workspace.create")}>
      <div className="space-y-4">
        <Input
          label={t("workspace.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("workspace.name")}
          autoFocus
        />
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[rgb(var(--text-muted))]">{t("workspace.color")}</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t("dialog.cancel")}</Button>
          <Button onClick={handleSave}>{t("dialog.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteWorkspaceDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dialog = useDialogStore((s) => s.dialog);
  const deleteWorkspace = useAppStore((s) => s.deleteWorkspace);

  if (dialog?.type !== "delete-workspace") return null;

  return (
    <Modal open onClose={onClose} title={t("workspace.delete")} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-[rgb(var(--text-muted))]">{t("workspace.confirmDelete")}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("dialog.cancel")}</Button>
          <Button variant="danger" onClick={async () => {
            await deleteWorkspace(dialog.workspaceId);
            onClose();
          }}>{t("dialog.delete")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function AccountDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dialog = useDialogStore((s) => s.dialog);
  const createAccount = useAppStore((s) => s.createAccount);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const accounts = useAppStore((s) => s.accounts);
  const settings = useAppStore((s) => s.settings);

  const isEdit = dialog?.type === "edit-account";
  const existing = isEdit ? accounts.find((a) => a.id === dialog?.accountId) : null;
  const workspaceId = dialog?.type === "create-account"
    ? dialog.workspaceId
    : existing?.workspaceId ?? "";

  const [name, setName] = useState(existing?.name ?? "");
  const [url, setUrl] = useState(existing?.url ?? settings.defaultUrl);
  const [color, setColor] = useState(existing?.color ?? "#6366f1");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setUrl(existing.url);
      setColor(existing.color);
    }
  }, [existing]);

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) return;
    if (isEdit && dialog?.type === "edit-account") {
      await updateAccount(dialog.accountId, { name, url, color });
    } else {
      await createAccount({ workspaceId, name, url, color });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? t("account.edit") : t("account.create")}>
      <div className="space-y-4">
        <Input
          label={t("account.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("account.name")}
          autoFocus
        />
        <Input
          label={t("account.url")}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[rgb(var(--text-muted))]">{t("account.color")}</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t("dialog.cancel")}</Button>
          <Button onClick={handleSave}>{t("dialog.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const dialog = useDialogStore((s) => s.dialog);
  const deleteAccount = useAppStore((s) => s.deleteAccount);

  if (dialog?.type !== "delete-account") return null;

  return (
    <Modal open onClose={onClose} title={t("account.delete")} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-[rgb(var(--text-muted))]">
          {dialog.accountIds.length > 1 
            ? `Tem certeza que deseja excluir as ${dialog.accountIds.length} contas selecionadas?` 
            : t("account.confirmDelete")}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("dialog.cancel")}</Button>
          <Button variant="danger" onClick={async () => {
            for (const id of dialog.accountIds) {
              await deleteAccount(id);
            }
            onClose();
          }}>{t("dialog.delete")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [activeTab, setActiveTab] = useState("geral");

  const tabs = [
    { id: "geral", label: "Geral", icon: <SettingsIcon size={14} /> },
    { id: "aparencia", label: "Aparência", icon: <Palette size={14} /> },
    { id: "performance", label: "Performance", icon: <Gauge size={14} /> },
    { id: "extensoes", label: "Extensões", icon: <Puzzle size={14} /> },
    { id: "proxy", label: "Proxy", icon: <Globe size={14} /> },
    { id: "navegacao", label: "Navegação", icon: <Globe size={14} /> },
    { id: "downloads", label: "Downloads", icon: <Download size={14} /> },
    { id: "atualizacoes", label: "Licença", icon: <RefreshCw size={14} /> },
    { id: "sobre", label: "Sobre", icon: <Info size={14} /> },
  ];

  const handleExport = async () => {
    const data = await invoke<any>("workspaces:export");
    await invoke("system:save-file", "idle-browser-backup.json", JSON.stringify(data, null, 2));
  };

  const handleImport = async () => {
    const content = await invoke<string | null>("system:open-file", [{ name: "JSON", extensions: ["json"] }]);
    if (content) {
      try {
        const data = JSON.parse(content);
        await invoke("workspaces:import", data);
        window.location.reload(); // Reload to apply imported data
      } catch (e) {
        console.error("Failed to parse import", e);
      }
    }
  };

  const handleChooseFolder = async () => {
    const folder = await invoke<string | null>("system:choose-directory");
    if (folder) updateSettings({ downloadsDir: folder });
  };

  return (
    <Modal open onClose={onClose} title="Configurações" maxWidth="max-w-3xl">
      <div className="flex w-[700px] h-[450px] min-h-[450px] max-h-[450px] -mx-4 -mb-4 border-t border-[rgb(var(--border)/0.5)]">
        
        {/* Sidebar Tabs */}
        <div className="w-56 border-r border-[rgb(var(--border)/0.5)] bg-[rgb(var(--bg-base)/0.3)] p-3 flex flex-col gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors outline-none",
                activeTab === tab.id
                  ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                  : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border)/0.5)]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-[rgb(var(--bg-deep))]">
          {activeTab === "geral" && (
            <div className="space-y-6 max-w-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[rgb(var(--text-primary))]">Idioma</span>
                <Select
                  value={settings.language}
                  onChange={(val) => {
                    updateSettings({ language: val });
                    i18n.changeLanguage(val);
                  }}
                  className="w-48"
                  options={[
                    { value: "pt-BR", label: "Sistema (Português)" },
                    { value: "en-US", label: "English" },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[rgb(var(--text-primary))]">Tema</span>
                <Select
                  value={settings.theme || "Escuro"}
                  onChange={(val) => updateSettings({ theme: val as any })}
                  className="w-48"
                  options={[
                    { value: "Escuro", label: "Escuro" },
                    { value: "Claro", label: "Claro" },
                    { value: "Sistema", label: "Sistema" },
                  ]}
                />
              </div>

              <div className="pt-4 space-y-5">
                <ToggleSetting
                  label="Inicializar com o Windows"
                  checked={settings.launchOnStartup}
                  onChange={(v) => updateSettings({ launchOnStartup: v })}
                />
                <ToggleSetting
                  label="Reabrir o último workspace ao iniciar"
                  checked={settings.restoreSession}
                  onChange={(v) => updateSettings({ restoreSession: v })}
                />
              </div>

              <div className="pt-6 border-t border-[rgb(var(--border)/0.5)] flex gap-3">
                <Button variant="ghost" onClick={handleExport} className="border border-[rgb(var(--border))] gap-2">
                  <Upload size={14} className="text-accent" />
                  Exportar workspaces
                </Button>
                <Button variant="ghost" onClick={handleImport} className="border border-[rgb(var(--border))] gap-2">
                  <DownloadIcon size={14} className="text-accent" />
                  Importar workspaces
                </Button>
              </div>
            </div>
          )}

          {activeTab === "aparencia" && (
            <ThemeCustomizer />
          )}

          {activeTab === "performance" && (
            <PerformanceSettings />
          )}

          {activeTab === "extensoes" && (
            <ExtensionsManager />
          )}

          {activeTab === "proxy" && (
            <ProxySettings />
          )}

          {activeTab === "navegacao" && (
            <div className="space-y-6 max-w-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[rgb(var(--text-primary))]">URL inicial padrão</span>
                <input
                  type="text"
                  value={settings.defaultUrl}
                  onChange={(e) => updateSettings({ defaultUrl: e.target.value })}
                  className="w-64 px-3 py-1.5 bg-[rgb(var(--bg-overlay))] border border-[rgb(var(--border))] rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[rgb(var(--text-primary))]">Zoom padrão</span>
                <Select
                  value={settings.defaultZoom || 100}
                  onChange={(val) => updateSettings({ defaultZoom: Number(val) })}
                  className="w-48"
                  options={[
                    { value: 50, label: "50%" },
                    { value: 75, label: "75%" },
                    { value: 90, label: "90%" },
                    { value: 100, label: "100%" },
                    { value: 110, label: "110%" },
                    { value: 125, label: "125%" },
                    { value: 150, label: "150%" },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[rgb(var(--text-primary))]">Layout padrão</span>
                <Select
                  value={settings.defaultLayout || "auto"}
                  onChange={(val) => updateSettings({ defaultLayout: val as any })}
                  className="w-48"
                  options={[
                    { value: "auto", label: "Grade automática" },
                    { value: "single", label: "Painel único" },
                    { value: "columns", label: "Colunas" },
                    { value: "rows", label: "Linhas" },
                    { value: "free", label: "Livre" },
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab === "downloads" && (
            <div className="space-y-6 max-w-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-[rgb(var(--text-primary))] block">Pasta de downloads</span>
                  <span className="text-xs text-[rgb(var(--text-faint))] mt-0.5 block">
                    {settings.downloadsDir || "Pasta padrão do sistema"}
                  </span>
                </div>
                <Button variant="ghost" onClick={handleChooseFolder} className="border border-[rgb(var(--border))] gap-2">
                  <FolderOpen size={14} className="text-accent" />
                  Escolher pasta...
                </Button>
              </div>

              <div className="pt-2">
                <ToggleSetting
                  label="Perguntar onde salvar cada download"
                  checked={settings.askDownloadDir}
                  onChange={(v) => updateSettings({ askDownloadDir: v })}
                />
              </div>
            </div>
          )}

          {activeTab === "atualizacoes" && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-lg font-bold text-[rgb(var(--text-primary))]">Licença KeyAuth</h3>
              <div className="p-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-overlay)/0.3)]">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-[rgb(var(--text-faint))] block mb-1">Usuário</span>
                    <span className="text-sm text-[rgb(var(--text-primary))] font-medium">
                      {localStorage.getItem("keyauth_user") || "Desconhecido"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[rgb(var(--text-faint))] block mb-1">Vencimento</span>
                    <span className="text-sm text-accent font-medium">
                      {localStorage.getItem("keyauth_expiry") || "Vitalício"}
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => {
                    localStorage.removeItem("keyauth_session");
                    window.location.reload();
                  }}
                  variant="ghost" 
                  className="border border-[rgb(var(--border))] gap-2 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                >
                  <RefreshCw size={14} />
                  Renovar ou Trocar Chave
                </Button>
              </div>
            </div>
          )}

          {activeTab === "sobre" && (
              <div className="flex flex-col items-center justify-center h-full text-center text-[rgb(var(--text-faint))] p-6">
                <div className="w-20 h-20 bg-[rgb(var(--bg-overlay))] rounded-2xl flex items-center justify-center mb-6 overflow-hidden p-2">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
                </div>
                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">UNION</h2>
                <p className="text-sm">Versão 1.0.0</p>
                <p className="text-xs max-w-xs mt-4">
                  Navegador simples e otimizado para uso de multiplas contas e relacionados. Desenvolvido pela UNION SCRIPTS.
                </p>
              </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [editingId, setEditingId] = useState<string | null>(null);

  const shortcutDefs = [
    { id: "select-panel-1", label: "Selecionar painel 1-9 (Exemplo)", defaultKey: "Ctrl+1" }, // We show just 1 as example
    { id: "next-panel", label: "Próximo painel", defaultKey: "Ctrl+Tab" },
    { id: "new-workspace", label: "Novo workspace", defaultKey: "Ctrl+Shift+N" },
    { id: "new-account", label: "Nova conta", defaultKey: "Ctrl+N" },
    { id: "reload-active", label: "Recarregar painel ativo", defaultKey: "Ctrl+R" },
    { id: "reload-ignore-cache", label: "Recarregar ignorando cache", defaultKey: "Ctrl+Shift+R" },
    { id: "reload-all", label: "Recarregar todas", defaultKey: "Ctrl+Alt+R" },
    { id: "mute-active", label: "Silenciar painel ativo", defaultKey: "Ctrl+M" },
    { id: "mute-all", label: "Silenciar todas", defaultKey: "Ctrl+Shift+M" },
    { id: "focus-address-bar", label: "Focar barra de endereço", defaultKey: "Ctrl+L" },
    { id: "zoom-in", label: "Zoom +", defaultKey: "Ctrl++" },
    { id: "zoom-out", label: "Zoom -", defaultKey: "Ctrl+-" },
    { id: "fullscreen", label: "Tela cheia", defaultKey: "F11" },
    { id: "settings", label: "Configurações", defaultKey: "Ctrl+," },
    { id: "help", label: "Ajuda", defaultKey: "F1" },
  ];

  useEffect(() => {
    if (!editingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setEditingId(null);
        return;
      }

      const parts = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      
      let key = e.key;
      if (key === "Control" || key === "Shift" || key === "Alt" || key === "Meta") return;
      
      if (key.length === 1) key = key.toUpperCase();
      if (key === " ") key = "Space";
      
      parts.push(key);
      const newShortcut = parts.join("+");

      const newShortcuts = { ...(settings.shortcuts || {}) };
      newShortcuts[editingId] = newShortcut;
      
      updateSettings({ shortcuts: newShortcuts });
      setEditingId(null);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [editingId, settings.shortcuts, updateSettings]);

  return (
    <Modal open onClose={onClose} title="Atalhos de teclado" maxWidth="max-w-md">
      {/* Removed max-h and overflow to prevent the slide bar (scrollbar) as requested */}
      <div className="space-y-2 pr-2 mt-2">
        {shortcutDefs.map((def) => {
          const currentShortcut = settings.shortcuts?.[def.id] || def.defaultKey;
          const isEditing = editingId === def.id;
          const keys = isEditing ? ["..."] : currentShortcut.split("+");

          return (
            <div key={def.id} className="flex justify-between items-center py-2 border-b border-[rgb(var(--border)/0.5)] last:border-0">
              <span className="text-xs text-[rgb(var(--text-primary))]">{def.label}</span>
              <button
                onClick={() => setEditingId(isEditing ? null : def.id)}
                className={cn(
                  "flex items-center gap-1 p-1 -mr-1 rounded cursor-pointer transition-colors outline-none",
                  isEditing ? "bg-accent/20 ring-1 ring-accent" : "hover:bg-[rgb(var(--border))]"
                )}
                title="Clique para alterar"
              >
                {keys.map((key, j) => (
                  <div key={j} className="flex items-center">
                    <kbd className={cn(
                      "px-1.5 py-0.5 rounded border text-[10px] font-mono shadow-sm",
                      isEditing ? "border-accent/50 bg-accent/10 text-accent" : "border-[rgb(var(--border))] bg-[rgb(var(--bg-overlay))] text-[rgb(var(--text-secondary))]"
                    )}>
                      {key}
                    </kbd>
                    {j < keys.length - 1 && <span className="text-surface-600 text-[10px] mx-1">+</span>}
                  </div>
                ))}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function ToggleSetting({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))] transition-colors">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`
          relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer
          ${checked ? "bg-accent" : "bg-surface-700"}
        `}
      >
        <div
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? "translate-x-4" : "translate-x-0"}
          `}
        />
      </div>
    </label>
  );
}

export function DialogManager() {
  const dialog = useDialogStore((s) => s.dialog);
  const close = useDialogStore((s) => s.close);

  if (!dialog) return null;

  switch (dialog.type) {
    case "create-workspace":
    case "edit-workspace":
      return <WorkspaceDialog onClose={close} />;
    case "delete-workspace":
      return <DeleteWorkspaceDialog onClose={close} />;
    case "create-account":
    case "edit-account":
      return <AccountDialog onClose={close} />;
    case "delete-account":
      return <DeleteAccountDialog onClose={close} />;
    case "settings":
      return <SettingsDialog onClose={close} />;
    case "keyboard-shortcuts":
      return <KeyboardShortcutsDialog onClose={close} />;
    default:
      return null;
  }
}
