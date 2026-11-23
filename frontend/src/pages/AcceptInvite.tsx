import { useState } from "react";
import { api } from "../api";
import { Activity, Loader2 } from "lucide-react";

export function AcceptInvite() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    setError("");
    try {
      await api.acceptInvite(token, password);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation is invalid or expired.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-[380px] relative animate-fade-in">
        <div className="bg-bg-raised border border-border-default rounded-xl p-8 shadow-md">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[17px] font-bold text-text-primary tracking-tight">Accept Invitation</div>
              <div className="text-[11px] text-text-muted font-medium">AgentFuse Control Plane</div>
            </div>
          </div>

          {!token ? (
            <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/15">
              <p className="text-[12px] font-mono text-red-400">Missing invitation token.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-[13px] text-text-tertiary">
                Set a password to activate your AgentFuse account.
              </p>
              <div>
                <label htmlFor="pw" className="block text-[12px] font-medium text-text-tertiary mb-1.5">
                  Password
                </label>
                <input
                  id="pw"
                  type="password"
                  value={password}
                  autoFocus
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-base/80 border border-border-default rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label htmlFor="pw2" className="block text-[12px] font-medium text-text-tertiary mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="pw2"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-bg-base/80 border border-border-default rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-accent-hover active:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? "Activating..." : "Activate account"}
              </button>
              {error && (
                <div className="p-2.5 rounded-xl bg-red-500/8 border border-red-500/15">
                  <p className="text-[12px] font-mono text-red-400">{error}</p>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
