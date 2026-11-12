import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode, FormEvent } from "react";
import { api, setApiKey, clearApiKey, type AuthUser } from "../api";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, PlayCircle, Loader2 } from "lucide-react";

interface AuthState {
  user: AuthUser | null;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({ user: null, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"password" | "apikey">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const u = await api.me();
        setUser(u);
        sessionStorage.setItem("cortexheal_role", u.role);
      } catch {
        setUser(null);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  async function finishLogin(u: AuthUser) {
    setUser(u);
    sessionStorage.setItem("cortexheal_role", u.role);
  }

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const u = await api.login(email.trim(), password);
      clearApiKey();
      await finishLogin(u);
    } catch {
      setErrorMsg("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  async function handleApiKeyLogin(token: string) {
    if (!token) return;
    setLoading(true);
    setErrorMsg("");
    setApiKey(token);
    try {
      await finishLogin(await api.me());
    } catch {
      clearApiKey();
      setErrorMsg("Invalid API key");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* best-effort */
    }
    clearApiKey();
    sessionStorage.removeItem("cortexheal_role");
    setUser(null);
    queryClient.clear();
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="relative">
          <div className="w-8 h-8 rounded-full border-2 border-border-default" />
          <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--color-border-default) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-default) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial gradient behind card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-[380px] relative animate-fade-in">
          <div className="bg-bg-raised/80 backdrop-blur-xl border border-border-default rounded-2xl p-8 shadow-2xl shadow-black/50">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[17px] font-bold text-text-primary tracking-tight">
                  CortexHeal
                </div>
                <div className="text-[11px] text-text-muted font-medium">Control Plane</div>
              </div>
            </div>

            {mode === "password" ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[12px] font-medium text-text-tertiary mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    autoFocus
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-bg-base/80 border border-border-default rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-[12px] font-medium text-text-tertiary mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-bg-base/80 border border-border-default rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-accent-hover active:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {loading ? "Signing in..." : "Sign in"}
                </button>
                <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1">
                  <span>Quick Admin:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@cortexheal.com");
                      setPassword("admin123");
                    }}
                    className="text-accent hover:underline hover:text-accent-hover font-semibold"
                  >
                    admin@cortexheal.com / admin123
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApiKeyLogin(apiKeyInput.trim());
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="apiKey" className="block text-[12px] font-medium text-text-tertiary mb-1.5">
                    API Key
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKeyInput}
                    autoFocus
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-bg-base/80 border border-border-default rounded-xl px-3.5 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                    placeholder="ctx_..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-accent-hover active:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {loading ? "Connecting..." : "Connect with key"}
                </button>
              </form>
            )}

            {errorMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-500/8 border border-red-500/15">
                <p className="text-xs font-mono text-red-400">{errorMsg}</p>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-border-subtle">
              <button
                onClick={() => {
                  setErrorMsg("");
                  setMode(mode === "password" ? "apikey" : "password");
                }}
                className="text-[12px] text-text-muted hover:text-text-secondary transition-colors"
              >
                {mode === "password" ? "Use an API key instead" : "Sign in with email & password"}
              </button>
            </div>
          </div>

          {/* Demo link */}
          <div className="text-center mt-6">
            <p className="text-[11px] text-text-muted mb-2">Want to see CortexHeal in action?</p>
            <button
              onClick={() => handleApiKeyLogin("ctx_viewer_public_demo_key_12345")}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-[13px] font-medium transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              View Live Public Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}
