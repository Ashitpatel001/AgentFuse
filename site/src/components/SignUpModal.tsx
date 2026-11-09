import React, { useState } from "react";
import { X, Check, Copy, ArrowRight, Shield, Terminal, Key, Sparkles, Building2, User, Mail, Cpu } from "lucide-react";

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: string;
}

export function SignUpModal({ isOpen, onClose, defaultPlan = "Developer" }: SignUpModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [framework, setFramework] = useState("langgraph");
  const [deploymentTarget, setDeploymentTarget] = useState("bare-metal");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate a unique API token for the user based on email/org
    const prefix = "ctx_live_";
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const key = `${prefix}${randomHex}`;
    setGeneratedKey(key);
    
    // Also store in sessionStorage for the dashboard proxy if on same origin or for clipboard
    try {
      sessionStorage.setItem("cortexheal_api_key", key);
    } catch {
      // ignore
    }
    setStep("success");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-fade-up">
        {/* Header accent strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />
        
        <div className="p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {step === "form" ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    Start Monitoring with CortexHeal
                  </h3>
                  <p className="text-[13px] text-slate-500">
                    Deploy deterministic safety & agent fleet watchdogs in &lt;2 mins.
                  </p>
                </div>
              </div>

              <div className="mb-6 p-3 rounded-xl bg-blue-50/70 border border-blue-100/80 flex items-center gap-2.5 text-xs text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Selected: <strong>{defaultPlan} Tier</strong> — No credit card required. Instant API credentials.</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Work Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> Organization / Workspace
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Acme AI Systems"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" /> Primary Agent Stack
                    </label>
                    <select
                      value={framework}
                      onChange={(e) => setFramework(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    >
                      <option value="langgraph">LangGraph / LangChain</option>
                      <option value="crewai">CrewAI</option>
                      <option value="autogen">Microsoft AutoGen</option>
                      <option value="llamaindex">LlamaIndex Workflows</option>
                      <option value="custom">Custom Agent Loop / Python</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-400" /> Deployment Mode
                    </label>
                    <select
                      value={deploymentTarget}
                      onChange={(e) => setDeploymentTarget(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    >
                      <option value="bare-metal">Self-Hosted Bare Metal</option>
                      <option value="docker">Docker Compose</option>
                      <option value="cloud">Managed Cloud / K8s</option>
                      <option value="local">Local Dev (Windows/Mac/Linux)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  Create Account & Generate Key
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-5 animate-fade-in-site">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Welcome aboard, {fullName.split(" ")[0] || "Engineer"}!
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Workspace <strong>{organization || "Default"}</strong> is provisioned with deterministic circuit breaker policies.
                </p>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-400" /> Your API Key (Admin)
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-emerald-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 break-all select-all">
                  {generatedKey}
                </div>
                <p className="text-[11px] text-slate-500">
                  Save this key securely. It authorizes your agents and grants admin rights to the control plane.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5 font-mono">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quick Install</div>
                <div className="text-slate-800">pip install cortexheal</div>
                <div className="text-slate-800">export CORTEXHEAL_API_KEY="{generatedKey.slice(0, 14)}..."</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={DASHBOARD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  Launch Dashboard
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
