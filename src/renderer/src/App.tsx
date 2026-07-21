import { useEffect } from "react";
import { useAppStore } from "./stores/appStore";
import { on, send } from "./lib/ipc";
import { Titlebar } from "./components/layout/Titlebar";
import { Sidebar } from "./components/layout/Sidebar";
import { AccountSidebar } from "./components/layout/AccountSidebar";
import { GlobalToolbar } from "./components/layout/GlobalToolbar";
import { Dashboard } from "./components/layout/Dashboard";
import { Footer } from "./components/layout/Footer";
import { DialogManager } from "./components/dialogs/DialogManager";
import { AuthOverlay } from "./components/auth/AuthOverlay";
import { ThemeProvider } from "./components/ThemeProvider";
import { useDialogStore } from "./stores/dialogStore";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "./lib/utils";
import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', backgroundColor: 'black', height: '100vh', width: '100vw' }}>
          <h2>React Crash!</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const loadAll = useAppStore((s) => s.loadAll);
  const updatePanelState = useAppStore((s) => s.updatePanelState);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const unsub = on("panels:state-changed", (accountId: unknown, state: unknown) => {
      if (typeof accountId === "string" && state && typeof state === "object") {
        updatePanelState(accountId, state as Record<string, unknown>);
      }
    });
    return unsub;
  }, [updatePanelState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keydown if target is an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      const state = useAppStore.getState();
      const { settings, activeWorkspaceId, activeAccountId, panelStates } = state;
      const workspaceAccounts = state.accounts.filter(a => a.workspaceId === activeWorkspaceId);

      // Helper to generate shortcut string
      const getShortcutStr = (e: KeyboardEvent) => {
        const parts = [];
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.shiftKey) parts.push("Shift");
        if (e.altKey) parts.push("Alt");
        
        let key = e.key;
        if (key === "Control" || key === "Shift" || key === "Alt" || key === "Meta") return "";
        
        if (key.length === 1) key = key.toUpperCase();
        if (key === " ") key = "Space";
        
        parts.push(key);
        return parts.join("+");
      };

      const pressedStr = getShortcutStr(e);
      if (!pressedStr) return;

      const shortcuts = settings.shortcuts || {};
      const action = Object.keys(shortcuts).find(key => shortcuts[key] === pressedStr);

      if (action) {
        e.preventDefault();
      }

      switch (action) {
        case "new-workspace":
          useDialogStore.getState().open({ type: "create-workspace" });
          break;
        case "new-account":
          if (activeWorkspaceId) useDialogStore.getState().open({ type: "create-account", workspaceId: activeWorkspaceId });
          break;
        case "reload-active":
          if (activeAccountId) send("panels:reload", activeAccountId);
          break;
        case "reload-ignore-cache":
          // Need to implement reload ignoring cache in backend if wanted, for now just reload
          if (activeAccountId) send("panels:reload", activeAccountId);
          break;
        case "reload-all":
          workspaceAccounts.forEach(acc => {
            if (panelStates[acc.id]) send("panels:reload", acc.id);
          });
          break;
        case "mute-active":
          if (activeAccountId) {
            const isMuted = panelStates[activeAccountId]?.isMuted;
            send("panels:mute", activeAccountId, !isMuted);
          }
          break;
        case "mute-all":
          workspaceAccounts.forEach(acc => {
            if (panelStates[acc.id]) send("panels:mute", acc.id, true);
          });
          break;
        case "focus-address-bar":
          const input = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (input) input.focus();
          break;
        case "zoom-in":
          if (activeAccountId) send("panels:zoom-in", activeAccountId);
          break;
        case "zoom-out":
          if (activeAccountId) send("panels:zoom-out", activeAccountId);
          break;
        case "fullscreen":
          if (!document.fullscreenElement) document.documentElement.requestFullscreen();
          else document.exitFullscreen();
          break;
        case "settings":
          useDialogStore.getState().open({ type: "settings" });
          break;
        case "help":
          useDialogStore.getState().open({ type: "keyboard-shortcuts" });
          break;
        case "next-panel":
          if (workspaceAccounts.length > 0) {
            const idx = workspaceAccounts.findIndex(a => a.id === activeAccountId);
            const nextIdx = (idx + 1) % workspaceAccounts.length;
            state.setActiveAccountId(workspaceAccounts[nextIdx].id);
          }
          break;
        default:
          if (action?.startsWith("select-panel-")) {
            const index = parseInt(action.replace("select-panel-", "")) - 1;
            if (index >= 0 && index < workspaceAccounts.length) {
              state.setActiveAccountId(workspaceAccounts[index].id);
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthOverlay>
          <div className="h-screen w-screen flex flex-col bg-[rgb(var(--bg-deep))] text-[rgb(var(--text-primary))] overflow-hidden font-sans selection:bg-accent/30">
          <Titlebar />
          
          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden relative">
            <Sidebar />
            <AccountSidebar />
            
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
              <GlobalToolbar />
              <Dashboard />
              <Footer />
            </div>
          </div>

          <DialogManager />
        </div>
      </AuthOverlay>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
