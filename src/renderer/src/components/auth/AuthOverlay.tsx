import { useState, useEffect } from "react";
import { Globe, Lock, Key, User, ArrowRight, ShieldCheck } from "lucide-react";
import { login, register, upgrade, isAuthenticated, init } from "@/lib/keyauth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo.png";

export function AuthOverlay({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState(isAuthenticated());
  const [mode, setMode] = useState<"login" | "register" | "upgrade" | "updating">("login");
  const [updateProgress, setUpdateProgress] = useState({ percent: 0, status: "Iniciando..." });
  
  const [username, setUsername] = useState(() => localStorage.getItem("saved_username") || "");
  const [password, setPassword] = useState(() => localStorage.getItem("saved_password") || "");
  const [licenseKey, setLicenseKey] = useState("");
  const [saveLogin, setSaveLogin] = useState(() => !!localStorage.getItem("saved_username"));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    init().then((res) => {
      if (res?.updateAvailable && res.downloadUrl) {
        setMode("updating");
        window.electronAPI.send("updates:keyauth-start", res.downloadUrl);
      }
      setLoading(false);
    });

    const removeListener = window.electronAPI.on("updates:keyauth-progress", (status: unknown, percent: unknown) => {
      setUpdateProgress({ 
        status: status as string, 
        percent: typeof percent === 'number' ? percent : 0 
      });
    });

    return () => removeListener();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let res;
      if (mode === "login") {
        res = await login(username, password);
      } else if (mode === "register") {
        res = await register(username, password, licenseKey);
      } else if (mode === "upgrade") {
        res = await upgrade(username, licenseKey);
      }

      if (res?.success) {
        if (mode === "login") {
          setAuth(true);
          if (saveLogin) {
            localStorage.setItem("saved_username", username);
            localStorage.setItem("saved_password", password);
          } else {
            localStorage.removeItem("saved_username");
            localStorage.removeItem("saved_password");
          }
        } else {
          setSuccess(mode === "register" ? "Conta criada com sucesso! Faça login." : "Conta renovada com sucesso! Faça login.");
          setMode("login");
          setLicenseKey("");
        }
      } else {
        setError(res?.message || "Ocorreu um erro ao comunicar com o servidor.");
      }
    } catch (e) {
      setError("Erro interno do aplicativo.");
    }

    setLoading(false);
  };

  if (auth) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-[rgb(var(--bg-deep))] flex items-center justify-center font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/5 rounded-full blur-[120px]" />
      </div>
      
      <div className="relative w-full max-w-[400px] p-8 bg-[rgb(var(--bg-deep)/0.8)] backdrop-blur-xl border border-[rgb(var(--border))] rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[rgb(var(--bg-overlay))] border border-[rgb(var(--border))] rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(var(--accent),0.2)] overflow-hidden p-2">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">UNION BROWSER</h1>
          <p className="text-sm text-[rgb(var(--text-faint))] mt-1">
            {mode === "updating" ? "Atualização Necessária" : "Autenticação Segura"}
          </p>
        </div>

        {mode !== "updating" && (
          <div className="flex gap-1 p-1 bg-[rgb(var(--bg-overlay))] rounded-xl mb-6">
            <button
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${mode === "login" ? "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] shadow-sm" : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-secondary))]"}`}
            >
              Login
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${mode === "register" ? "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] shadow-sm" : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-secondary))]"}`}
            >
              Registrar
            </button>
            <button
              onClick={() => { setMode("upgrade"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${mode === "upgrade" ? "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] shadow-sm" : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-secondary))]"}`}
            >
              Renovar
            </button>
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium text-center">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs font-medium text-center">{success}</div>}

        {mode === "updating" ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="w-full bg-[rgb(var(--bg-overlay))] rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-accent h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${updateProgress.percent}%` }}
              ></div>
            </div>
            <p className="text-sm text-[rgb(var(--text-primary))] font-medium">
              {updateProgress.status} {updateProgress.percent > 0 && `${Math.round(updateProgress.percent)}%`}
            </p>
            <p className="text-xs text-[rgb(var(--text-faint))] text-center">
              O aplicativo está baixando a versão mais recente. Ele será reiniciado automaticamente quando concluir.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[rgb(var(--text-faint))] uppercase tracking-wider ml-1">Usuário</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]">
                <User size={14} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                className="w-full bg-[rgb(var(--bg-overlay)/0.5)] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] text-sm rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-accent focus:bg-[rgb(var(--bg-overlay))] transition-colors"
                placeholder="Seu usuário"
              />
            </div>
          </div>

          {mode !== "upgrade" && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[rgb(var(--text-faint))] uppercase tracking-wider ml-1">Senha</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]">
                  <Lock size={14} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-[rgb(var(--bg-overlay)/0.5)] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] text-sm rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-accent focus:bg-[rgb(var(--bg-overlay))] transition-colors"
                  placeholder="Sua senha secreta"
                />
              </div>
            </div>
          )}

          {mode !== "login" && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[rgb(var(--text-faint))] uppercase tracking-wider ml-1">Chave de Licença</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]">
                  <Key size={14} />
                </div>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-[rgb(var(--bg-overlay)/0.5)] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] text-sm rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-accent focus:bg-[rgb(var(--bg-overlay))] transition-colors font-mono"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
              </div>
            </div>
          )}

          {mode === "login" && (
            <label className="flex items-center gap-2 cursor-pointer group mt-2 select-none">
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                  saveLogin ? "bg-accent border-accent text-[#060913]" : "bg-[rgb(var(--bg-overlay))] border-[rgb(var(--border))] hover:border-[rgb(var(--border))]"
                )}
              >
                {saveLogin && <ShieldCheck size={10} className="stroke-[3]" />}
              </div>
              <span className="text-xs text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))] transition-colors">
                Lembrar minhas credenciais
              </span>
              <input
                type="checkbox"
                className="hidden"
                checked={saveLogin}
                onChange={(e) => setSaveLogin(e.target.checked)}
              />
            </label>
          )}

          <div className="pt-2">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full py-2.5 gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>Entrar no sistema <ArrowRight size={14} /></>
              ) : mode === "register" ? (
                "Criar conta"
              ) : (
                "Aplicar renovação"
              )}
            </Button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
