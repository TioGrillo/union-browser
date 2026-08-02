import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAppStore } from "@/stores/appStore";
import { Globe, Navigation, Star, History, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavigateModal({ onClose, accountIds }: { onClose: () => void; accountIds: string[] }) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateAccount = useAppStore((s) => s.updateAccount);

  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"favorites" | "history">("favorites");

  const favorites = settings.favoriteUrls || [];
  const history = settings.history || [];

  const handleNavigate = (targetUrl: string) => {
    let finalUrl = targetUrl.trim();
    if (!finalUrl) return;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    accountIds.forEach(id => {
      // Update account URL
      updateAccount(id, { url: finalUrl });
      // Dispatch event to navigate
      window.dispatchEvent(new CustomEvent(`panel:navigate:${id}`, { detail: { url: finalUrl } }));
    });
    onClose();
  };

  const handleAddFavorite = () => {
    let finalUrl = url.trim();
    if (!finalUrl) return;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }
    const newFav = { url: finalUrl, title: finalUrl };
    if (!favorites.find(f => f.url === finalUrl)) {
      updateSettings({ favoriteUrls: [newFav, ...favorites] });
    }
  };

  const handleRemoveFavorite = (favUrl: string) => {
    updateSettings({ favoriteUrls: favorites.filter(f => f.url !== favUrl) });
  };

  const handleClearHistory = () => {
    updateSettings({ history: [] });
  };

  return (
    <Modal open onClose={onClose} title={`Redirecionar (${accountIds.length} contas)`} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Digite a URL (ex: https://google.com)"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNavigate(url);
            }}
          />
          <Button onClick={() => handleNavigate(url)} className="shrink-0 gap-2 px-4 h-9 mt-[22px]">
            <Navigation size={14} />
            Ir
          </Button>
          <Button variant="ghost" onClick={handleAddFavorite} title="Salvar nos Favoritos" className="shrink-0 gap-2 px-3 h-9 mt-[22px] border border-[rgb(var(--border))]">
            <Star size={14} className="text-yellow-400" />
          </Button>
        </div>

        <div className="flex flex-col border border-[rgb(var(--border)/0.5)] rounded-xl overflow-hidden bg-[rgb(var(--bg-overlay))]">
          <div className="flex border-b border-[rgb(var(--border)/0.5)]">
            <button
              onClick={() => setActiveTab("favorites")}
              className={cn(
                "flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2",
                activeTab === "favorites" ? "bg-[rgb(var(--bg-surface))] text-accent" : "text-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface)/0.5)] hover:text-[rgb(var(--text-secondary))]"
              )}
            >
              <Star size={14} /> Favoritos
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 border-l border-[rgb(var(--border)/0.5)]",
                activeTab === "history" ? "bg-[rgb(var(--bg-surface))] text-accent" : "text-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface)/0.5)] hover:text-[rgb(var(--text-secondary))]"
              )}
            >
              <History size={14} /> Histórico
            </button>
          </div>

          <div className="h-[250px] overflow-y-auto custom-scrollbar p-2">
            {activeTab === "favorites" && (
              <div className="flex flex-col gap-1">
                {favorites.length === 0 ? (
                  <div className="text-center text-[rgb(var(--text-faint))] text-xs py-8">
                    Nenhum favorito salvo.
                  </div>
                ) : (
                  favorites.map((fav, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgb(var(--bg-base))] transition-colors group">
                      <Globe size={12} className="text-[rgb(var(--text-faint))]" />
                      <div className="flex-1 min-w-0 flex flex-col cursor-pointer" onClick={() => handleNavigate(fav.url)}>
                        <span className="text-xs font-medium text-[rgb(var(--text-primary))] truncate">{fav.title}</span>
                        <span className="text-[10px] text-[rgb(var(--text-faint))] truncate">{fav.url}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(fav.url); }} className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="flex flex-col gap-1">
                {history.length === 0 ? (
                  <div className="text-center text-[rgb(var(--text-faint))] text-xs py-8">
                    Nenhum histórico registrado.
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end mb-2">
                      <Button variant="ghost" onClick={handleClearHistory} className="h-6 text-[10px] text-red-400 hover:bg-red-500/10">
                        Limpar Histórico
                      </Button>
                    </div>
                    {history.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgb(var(--bg-base))] transition-colors cursor-pointer" onClick={() => handleNavigate(item.url)}>
                        <History size={12} className="text-[rgb(var(--text-faint))]" />
                        <div className="flex-1 min-w-0 flex flex-col">
                          <span className="text-xs font-medium text-[rgb(var(--text-primary))] truncate">{item.title}</span>
                          <span className="text-[10px] text-[rgb(var(--text-faint))] truncate">{item.url}</span>
                        </div>
                        <span className="text-[9px] text-[rgb(var(--text-muted))] shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
