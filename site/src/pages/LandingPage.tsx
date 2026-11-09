import { useState } from "react";
import {
  Lock,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Copy,
  Check,
  FileText,
  RotateCcw,
  ExternalLink,
  Shield,
  Activity,
  Cpu,
  Layers,
  Sparkles,
  UserPlus
} from "lucide-react";
import { SafetyDiagram } from "../components/SafetyDiagram";
import { LiveMonitoringPreview } from "../components/LiveMonitoringPreview";
import { PricingSection } from "../components/PricingSection";
import { SignUpModal } from "../components/SignUpModal";

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";

const proxySnippet = `from openai import OpenAI

# 30-Second Setup: Point base_url to CortexHeal Gateway
# Use your own OpenAI key (BYOK) — OpenAI bills you directly
client = OpenAI(
    base_url="http://localhost:8000/v1",  # CortexHeal Circuit Breaker
    api_key="your_openai_api_key",
    default_headers={"X-Agent-ID": "finance_reconciliation_agent"}
)

# If an agent enters a runaway loop, CortexHeal trips in 2ms
# and returns HTTP 429 BEFORE reaching OpenAI — zero tokens burned!
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Reconcile unallocated ledger credits..."}]
)`;

const codeSnippet = `from cortexheal import CortexHeal
from cortexheal.adapters.langgraph import LangGraphAdapter

# In-Memory Resumption: Attach SafetyGate to your LangGraph DAG
adapter = LangGraphAdapter(agent_id="support_router")
cortex  = CortexHeal(adapter=adapter)

# Physically pauses graph with interrupt() — resume without restart
builder.add_node("safety_gate", cortex.safety_gate)
builder.set_entry_point("safety_gate")`;

export function LandingPage() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"proxy" | "adapter">("proxy");
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Developer");

  const currentSnippet = activeTab === "proxy" ? proxySnippet : codeSnippet;

  const copyCode = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSignUp = (plan = "Developer") => {
    setSelectedPlan(plan);
    setIsSignUpOpen(true);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] gradient-hero pointer-events-none" />

      {/* ─── Hero ─── */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50/60 text-blue-800 text-[11px] font-semibold mb-7 shadow-sm animate-fade-up">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          The Automated Circuit Breaker & Safety Firewall for AI Agents
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold text-slate-900 tracking-tight leading-[1.08] max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: "80ms" }}>
          Stop runaway agent loops in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500">
            24 milliseconds
          </span>
        </h1>

        <p className="mt-6 text-[16px] sm:text-[18px] text-slate-600 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "160ms" }}>
          Every time an enterprise agent gets stuck in a tool loop, it burns $200–$500 in tokens and risks corrupting production databases. CortexHeal is the deterministic circuit breaker that stops loops before they compound — <strong>zero LLM hallucinations in the safety path.</strong>
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <button
            onClick={() => handleOpenSignUp("Developer")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 hover:-translate-y-0.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Sign Up for Free Key
          </button>
          
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[14px] font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all"
          >
            <Activity className="w-4 h-4 text-blue-600" />
            Launch Live Dashboard
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <a
            href="/docs"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Terminal className="w-4 h-4 text-slate-400" />
            View Quickstart
          </a>
        </div>

        <p className="mt-4 text-[12px] text-slate-400">
          Open-source friendly • Runs locally or on Bare-Metal Linux • Instant API key provisioning
        </p>

        {/* Live Metrics Ribbons */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left animate-fade-up" style={{ animationDelay: "320ms" }}>
          {[
            { label: "Safety Gate Latency", value: "~24ms p50", sub: "Mathematical check" },
            { label: "LLMs in Safety Path", value: "0 tokens", sub: "No hallucinations" },
            { label: "Agent Queue Scale", value: "10,000+ tasks", sub: "Redis + Postgres" },
            { label: "Audit Format", value: "RFC JSON + CSV", sub: "Per-tenant isolation" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="p-4 bg-white/90 backdrop-blur border border-slate-200/90 rounded-2xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
              <span className="block text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                {label}
              </span>
              <span className="text-[17px] font-extrabold text-slate-900 tracking-tight mt-0.5 block">{value}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Watchdog & Agent Queue Live Monitor (PostHog / Datadog style) ─── */}
      <section id="monitoring" className="py-16 max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Real-Time Telemetry
          </div>
          <h2 className="text-3xl sm:text-[36px] font-extrabold text-slate-900 tracking-tight leading-tight">
            Datadog Watchdog & PostHog grade observability for agents
          </h2>
          <p className="text-sm text-slate-500 mt-3">
            Interact with our simulated fleet below. Trigger runaway loops or budget spikes to see the circuit breaker intervene in under 30 milliseconds.
          </p>
        </div>

        <LiveMonitoringPreview />
      </section>

      {/* ─── How Safety Gate Works ─── */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <SafetyDiagram />
      </section>

      {/* ─── Architecture & Engineering Pillars ─── */}
      <section className="py-24 bg-slate-50/70 border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-[11px] font-mono font-semibold text-blue-600 uppercase tracking-wider mb-3">
              Under The Hood
            </p>
            <h2 className="text-3xl sm:text-[36px] font-extrabold text-slate-900 tracking-tight leading-tight">
              Built for production systems engineers
            </h2>
            <p className="text-sm text-slate-500 mt-3">
              No black-box proxies. CortexHeal integrates directly at your agent DAG runtime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                Icon: Lock,
                title: "Deterministic State Breakers",
                desc: "Uses cryptographic SHA-256 state hashing and exact mathematical threshold sliding windows. Circuit breaks are 100% reproducible and audit-verifiable.",
                checks: [
                  "Exact argument & prompt hashing",
                  "Configurable loop thresholds (N ≥ 4)",
                  "Sub-30ms execution overhead",
                ],
              },
              {
                Icon: RotateCcw,
                title: "Human-in-the-Loop Recovery",
                desc: "When an agent is paused, operators can approve auto-generated contextual interventions, modify prompts, or roll back state without restarting the run.",
                checks: [
                  "Automated diagnosis generation",
                  "RBAC-controlled action approval",
                  "Live state resumption via SSE",
                ],
              },
              {
                Icon: FileText,
                title: "Multi-Tenant Audit Trail",
                desc: "Immutable ledger logging every trigger event, memory hash, recovery decision, and operator identity with complete tenant isolation.",
                checks: [
                  "One-click CSV & JSON export",
                  "Dual-plane auth (API key + Session)",
                  "Air-gapped bare-metal ready",
                ],
              },
            ].map(({ Icon, title, desc, checks }) => (
              <div
                key={title}
                className="bg-white p-7 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/[0.04] transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[16px] font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed mb-5">{desc}</p>
                </div>
                <ul className="space-y-2 border-t border-slate-100 pt-4">
                  {checks.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-[12px] text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Code Integration Section ─── */}
      <section className="py-24 max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-mono font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Integration Modes
            </p>
            <h2 className="text-3xl sm:text-[36px] font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
              Integrate in 30 seconds or wrap your graph
            </h2>
            <p className="text-[14px] text-slate-500 leading-relaxed mb-6">
              Choose the integration depth that fits your team: switch your LLM base URL to our zero-code gateway, or drop the native SafetyGate node into your LangGraph DAG for in-memory resumption.
            </p>

            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-2 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("proxy")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "proxy"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Zero-Code Proxy Gateway
              </button>
              <button
                onClick={() => setActiveTab("adapter")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "adapter"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                LangGraph / Agent Adapter
              </button>
            </div>

            <div className="space-y-3 text-[13px] text-slate-700">
              {activeTab === "proxy" ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-[11px] border border-blue-100 flex-shrink-0">1</span>
                    <span>Set <code>base_url="https://gateway.cortexheal.com/v1"</code></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-[11px] border border-blue-100 flex-shrink-0">2</span>
                    <span>Use your existing OpenAI/Anthropic API key (BYOK)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-[11px] border border-blue-100 flex-shrink-0">3</span>
                    <span>Gateway blocks runaway loops with HTTP 429 before upstream calls</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-[11px] border border-blue-100 flex-shrink-0">1</span>
                    <span className="font-mono text-xs">pip install cortexheal</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-[11px] border border-blue-100 flex-shrink-0">2</span>
                    <span className="font-mono text-xs">Attach LangGraphAdapter or AutoGenAdapter</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-bold text-[11px] border border-blue-100 flex-shrink-0">3</span>
                    <span className="font-mono text-xs">Physically pause graph with interrupt() & resume cleanly</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center gap-4">
              <button
                onClick={() => handleOpenSignUp("Developer")}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-600/20"
              >
                Get Gateway Key
              </button>
              <a href="/docs" className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
                Read Gateway Docs <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="relative bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-2xl shadow-slate-900/50">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-[11px] font-mono text-slate-500">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 text-slate-400">
                  {activeTab === "proxy" ? "openai_gateway_client.py" : "langgraph_agent.py"}
                </span>
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="font-mono text-[12px] leading-relaxed overflow-x-auto text-blue-300 whitespace-pre">
              <code>{currentSnippet}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <PricingSection onSelectPlan={handleOpenSignUp} />

      {/* ─── Final CTA ─── */}
      <section className="py-20 border-t border-slate-200/80 bg-white text-center">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-3xl sm:text-[40px] font-extrabold text-slate-900 tracking-tight leading-tight">
            Stop runaway agents before they ship
          </h2>
          <p className="text-[15px] text-slate-500 leading-relaxed max-w-xl mx-auto">
            Get instant visibility into agent queues, loop anomalies, and budget ceilings. Self-host on bare-metal or test locally in under 3 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
            <button
              onClick={() => handleOpenSignUp("Developer")}
              className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 text-white font-bold text-[14px] rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all inline-flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Sign Up for Free Account
            </button>
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-white text-slate-700 font-semibold text-[14px] rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              Open Dashboard
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        defaultPlan={selectedPlan}
      />
    </div>
  );
}
