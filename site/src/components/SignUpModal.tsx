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
    const prefix = "ctx_live_";
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const key = `${prefix}${randomHex}`;
    setGeneratedKey(key);
    
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
        <div className="h-1.5 w-full bg-indigo-600" />
        
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {step === "form" ? "Provision CortexHeal Key" : "Your API Key is Ready"}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  100% Free & Open Source • Zero Telemetry Egress
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="jane@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 uppercase tracking-wider mb-1.5">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Acme Autonomous Systems"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-mono font-medium text-slate-600 uppercase tracking-wider mb-1.5">
                    Agent Framework
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  >
                    <option value="langgraph">LangGraph / LangChain</option>
                    <option value="crewai">CrewAI</option>
                    <option value="autogen">Microsoft AutoGen</option>
                    <option value="proxy">OpenAI Proxy (/v1 Drop-in)</option>
                    <option value="custom">Custom In-House Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-medium text-slate-600 uppercase tracking-wider mb-1.5">
                    Deployment Mode
                  </label>
                  <select
                    value={deploymentTarget}
                    onChange={(e) => setDeploymentTarget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  >
                    <option value="bare-metal">Self-Hosted Bare-Metal</option>
                    <option value="docker">Docker Compose</option>
                    <option value="cloud">CortexHeal Cloud Gateway</option>
                  </select>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                >
                  <Key className="w-3.5 h-3.5" />
                  Generate Production Key
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in-site">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                  <Check className="w-4 h-4 text-emerald-600" />
                  API Key Created for {organization || "Your Organization"}
                </div>
                <p className="text-[11px] text-slate-600">
                  This key authorizes your agents to stream telemetry and use the circuit breaker gateway.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5">
                  <span>YOUR X-API-KEY</span>
                  <span className="text-[10px] text-amber-600 font-semibold">Save this now — never displayed again</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-white">
                  <span className="flex-1 truncate text-indigo-300">{generatedKey}</span>
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={DASHBOARD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                >
                  Open Live Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Close & Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
