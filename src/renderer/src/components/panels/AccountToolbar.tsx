import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Square,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Home,
  Camera,
} from "lucide-react";
import { send, invoke } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { PanelState } from "@/types/index";

function ToolbarButton({
  onClick,
  disabled,
  children,
  title,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded-lg transition-all",
        disabled
          ? "text-surface-600 cursor-not-allowed"
          : "text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 active:scale-95",
        className
      )}
    >
      {children}
    </button>
  );
}

export function AccountToolbar({
  accountId,
  state,
}: {
  accountId: string;
  state: PanelState;
}) {
  const iconSize = 13;

  return (
    <div className="flex items-center gap-0.5 no-drag">
      <ToolbarButton
        onClick={() => send("panels:back", accountId)}
        disabled={!state.canGoBack}
        title="Back"
      >
        <ArrowLeft size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => send("panels:forward", accountId)}
        disabled={!state.canGoForward}
        title="Forward"
      >
        <ArrowRight size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => send("panels:reload", accountId)}
        title="Reload"
      >
        {state.isLoading ? <Square size={iconSize - 1} /> : <RotateCw size={iconSize} />}
      </ToolbarButton>

      <div className="w-px h-4 bg-surface-700 mx-0.5" />

      <ToolbarButton
        onClick={() => send("panels:zoom", accountId, Math.min(state.zoom + 10, 200))}
        title="Zoom In"
      >
        <ZoomIn size={iconSize} />
      </ToolbarButton>

      <span className="text-[10px] text-surface-500 w-8 text-center font-mono">
        {state.zoom}%
      </span>

      <ToolbarButton
        onClick={() => send("panels:zoom", accountId, Math.max(state.zoom - 10, 30))}
        title="Zoom Out"
      >
        <ZoomOut size={iconSize} />
      </ToolbarButton>

      <div className="w-px h-4 bg-surface-700 mx-0.5" />

      <ToolbarButton
        onClick={() => send("panels:mute", accountId, !state.isMuted)}
        title={state.isMuted ? "Unmute" : "Mute"}
      >
        {state.isMuted ? <VolumeX size={iconSize} /> : <Volume2 size={iconSize} />}
      </ToolbarButton>
    </div>
  );
}
