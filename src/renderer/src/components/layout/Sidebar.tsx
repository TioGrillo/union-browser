import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Settings, Layers, Pencil, Copy, Trash2 } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { createPortal } from "react-dom";
import { useDialogStore } from "@/stores/dialogStore";
import { cn } from "@/lib/utils";

export function ContextMenu({
  onClose,
  items,
  x,
  y,
}: {
  onClose: () => void;
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  x?: number;
  y?: number;
}) {
  const isFixed = x !== undefined && y !== undefined;
  
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      onClose();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.12 }}
        style={isFixed ? { position: "fixed", left: x, top: y } : { position: "absolute", left: "100%", top: 0, marginLeft: "4px" }}
        className="z-[100] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border)/0.8)] rounded-xl shadow-panel overflow-hidden min-w-[160px]"
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors",
              item.danger
                ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                : "text-[rgb(var(--text-secondary))] hover:bg-accent/15 hover:text-accent"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </motion.div>
    </>,
    document.body
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const workspaces = useAppStore((s) => s.workspaces);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useAppStore((s) => s.setActiveWorkspace);
  const setIsOverlayOpen = useAppStore((s) => s.setIsOverlayOpen);
  const openDialog = useDialogStore((s) => s.open);

  const [contextMenu, setContextMenu] = useState<{ workspaceId: string; x: number; y: number } | null>(
    null
  );

  const handleOpenContextMenu = (workspaceId: string, x: number, y: number) => {
    setIsOverlayOpen(true);
    setContextMenu({ workspaceId, x, y });
  };

  const handleCloseContextMenu = () => {
    setIsOverlayOpen(false);
    setContextMenu(null);
  };

  return (
    <div className="flex flex-col bg-[rgb(var(--bg-base))] border-r border-surface-900 h-full w-[56px] shrink-0 overflow-hidden items-center py-3 select-none">
      {/* Workspace Icons List */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden px-1 space-y-2.5 flex flex-col items-center">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          const firstLetter = ws.name.charAt(0).toUpperCase();

          return (
            <div key={ws.id} className="relative group">
              <motion.button
                layout
                onClick={() => setActiveWorkspace(ws.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenContextMenu(ws.id, e.clientX, e.clientY);
                }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative",
                  isActive
                    ? "bg-accent/15 text-accent shadow-[0_0_12px_rgba(var(--accent),0.2)] border border-accent/30"
                    : "bg-[rgb(var(--border)/0.4)] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--border)/0.8)] hover:text-[rgb(var(--text-primary))] border border-transparent"
                )}
                style={{
                  color: isActive ? ws.color : undefined,
                  borderColor: isActive ? ws.color + "50" : undefined,
                  background: isActive ? ws.color + "18" : undefined,
                }}
              >
                {ws.icon === "layers" ? <Layers size={15} /> : <span className="text-sm font-semibold">{firstLetter}</span>}
                {isActive && (
                  <div
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md"
                    style={{ background: ws.color || "rgb(var(--accent))" }}
                  />
                )}
              </motion.button>

              {/* Tooltip */}
              <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 bg-[rgb(var(--bg-overlay))] border border-surface-800 text-[rgb(var(--text-primary))] text-[10px] font-medium py-1 px-2.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                {ws.name}
              </div>
            </div>
          );
        })}

        {/* Add Workspace Button */}
        <button
          onClick={() => openDialog({ type: "create-workspace" })}
          className="w-10 h-10 rounded-xl bg-[rgb(var(--border)/0.2)] text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-secondary))] hover:bg-surface-900/60 border border-dashed border-[rgb(var(--border)/0.5)] flex items-center justify-center transition-all hover:scale-105"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="w-full px-1 pt-3 border-t border-[rgb(var(--border)/0.5)] flex flex-col items-center gap-2 shrink-0">
        <button
          onClick={() => openDialog({ type: "settings" })}
          className="w-10 h-10 rounded-xl bg-[rgb(var(--border)/0.1)] text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--border)/0.4)] flex items-center justify-center transition-colors"
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={handleCloseContextMenu}
            items={[
              {
                label: "Editar Workspace",
                icon: <Pencil size={12} />,
                onClick: () => openDialog({ type: "edit-workspace", workspaceId: contextMenu.workspaceId }),
              },
              {
                label: "Duplicar Workspace",
                icon: <Copy size={12} />,
                onClick: async () => {
                  const ws = workspaces.find((w) => w.id === contextMenu.workspaceId);
                  if (ws) {
                    useAppStore.getState().createWorkspace({
                      name: ws.name + " (cópia)",
                      color: ws.color,
                      icon: ws.icon,
                    });
                  }
                },
              },
              {
                label: "Excluir Workspace",
                icon: <Trash2 size={12} />,
                danger: true,
                onClick: () => openDialog({ type: "delete-workspace", workspaceId: contextMenu.workspaceId }),
              },
            ]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
