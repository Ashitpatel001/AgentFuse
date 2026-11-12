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
  UserPlus,
  Play,
  Flame,
  Zap,
  Sliders,
  AlertTriangle
} from "lucide-react";
import { SafetyDiagram } from "../components/SafetyDiagram";
import { LiveMonitoringPreview } from "../components/LiveMonitoringPreview";
import { PricingSection } from "../components/PricingSection";
import { SignUpModal } from "../components/SignUpModal";

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";

const proxySnippet = `from openai import OpenAI

# 1-Line Drop-in: Point base_url to CortexHeal Gateway
# Use your own OpenAI API key (BYOK) — OpenAI bills you directly
client = OpenAI(
    base_url="https://api.cortexheal.com/v1",  # CortexHeal Circuit Breaker
    api_key="sk-your-openai-key",
    default_headers={"X-Agent-ID": "finance_reconciliation_agent"}
)

# If this agent repeats identical tool calls (N >= 4), CortexHeal
# trips in 24ms and returns HTTP 429 BEFORE calling OpenAI!
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Reconcile unallocated ledger credits..."}]
)`;

const codeSnippet = `from cortexheal import CortexHeal
from cortexheal.adapters.langgraph import LangGraphAdapter

# In-Process Resumption: Attach SafetyGate to your LangGraph DAG
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

  // Interactive Live Simulator State
  const [simStep, setSimStep] = useState<"idle" | "running" | "tripped" | "budget_tripped">("idle");
  const [simLogs, setSimLogs] = useState<string[]>([
    "System idle. Select a simulation below to test circuit breaker behavior."
  ]);

  // Interactive Runaway Loss Calculator
  const [agentCount, setAgentCount] = useState(10);
  const [hourlyCalls, setHourlyCalls] = useState(120);

  // Math: 1 loop = ~15 repeated calls with GPT-4o input/output tokens = ~$12.50. 
  // With 10 agents, estimated 2-4 rogue loops per month = ~$150-$600 runaway risk.
  const estimatedSavedPerMonth = Math.round((agentCount * hourlyCalls * 0.0028 * 24 * 30 * 0.08));

  const copyCode = () => {
    navigator.clipboard.writeText(activeTab === "proxy" ? proxySnippet : codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSignUp = (plan = "Developer") => {
    setSelectedPlan(plan);
    setIsSignUpOpen(true);
  };

  const runSimulation = (type: "loop" | "budget" | "normal") => {
    setSimStep("running");
    setSimLogs(["[00:00.000] Ingesting request for agent: 'crm_support_bot'..."]);

    setTimeout(() => {
      if (type === "loop") {
        setSimLogs([
          "[00:00.008] Step 1: Tool 'search_crm_tickets' -> args: {user: '10482'} (200 OK)",
          "[00:00.016] Step 2: Tool 'search_crm_tickets' -> args: {user: '10482'} (200 OK)",
          "[00:00.022] Step 3: Tool 'search_crm_tickets' -> args: {user: '10482'} (200 OK)",
          "[00:00.024] ⚡ SHA-256 state hash '7f8a32...' matches 4th time in sliding window!",
          "[00:00.026] 🛑 CIRCUIT BREAKER TRIPPED (HTTP 429 STUCK_LOOP_TRIPPED) in 24ms",
          "[00:00.028] 🛡️ 4 upstream OpenAI calls blocked. Saved ~$3.80. Slack webhook dispatched."
        ]);
        setSimStep("tripped");
      } else if (type === "budget") {
        setSimLogs([
          "[00:00.010] Step 1: Bulk LLM embedding -> 12,000 prompt tokens ($0.03)",
          "[00:00.018] Step 2: Bulk LLM embedding -> 45,000 prompt tokens ($0.11)",
          "[00:00.022] ⚠️ Run cost $1.02 exceeds hard ceiling limit ($1.00)",
          "[00:00.024] 🛑 CIRCUIT BREAKER TRIPPED (HTTP 429 BUDGET_EXCEEDED) in 22ms",
          "[00:00.026] 🛡️ Upstream API paused. Run safely parked for operator review."
        ]);
        setSimStep("budget_tripped");
      } else {
        setSimLogs([
          "[00:00.012] Step 1: Tool 'vector_search' -> state hash '10ac4...' (200 OK)",
          "[00:00.035] Step 2: Tool 'format_summary' -> state hash 'd8e92...' (200 OK)",
          "[00:00.052] Step 3: Tool 'dispatch_email' -> state hash '33fa1...' (200 OK)",
          "[00:00.060] ✅ Run completed successfully. 3 distinct state hashes, zero repetitions."
        ]);
        setSimStep("idle");
      }
    }, 600);
  };

  return (
    <div className="relative overflow-hidden bg-zinc-950 text-white min-h-screen">
      <div className="absolute inset-0 grid-bg-dark pointer-events-none opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] gradient-hero-dark pointer-events-none" />

      {/* ─── Hero ─── */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-20 max-w-6xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[11px] font-mono font-semibold mb-7 shadow-sm animate-fade-up">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          The Automated Circuit Breaker & Safety Firewall for Autonomous AI Agents
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-[64px] font-extrabold text-white tracking-tight leading-[1.08] max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: "80ms" }}>
          Stop runaway agent loops in{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
            24 milliseconds
          </span>
        </h1>

        <p className="mt-6 text-[16px] sm:text-[18px] text-zinc-400 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "160ms" }}>
          Every time an enterprise agent gets stuck in a tool loop, it burns $200–$500 in tokens and risks corrupting production databases. CortexHeal is the deterministic circuit breaker that stops loops before they compound — <strong className="text-white font-semibold">zero LLM hallucinations in the safety path.</strong>
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <button
            onClick={() => handleOpenSignUp("Developer")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            Sign Up for Free Key
          </button>
          
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[14px] font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 rounded-xl shadow-sm transition-all"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            Launch Live Console
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
          </a>

          <a
            href="https://github.com/Ashitpatel001/Cortexheal"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[14px] font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <Terminal className="w-4 h-4 text-zinc-500" />
            GitHub Repo
          </a>
        </div>

        <p className="mt-4 text-[12px] text-zinc-500 font-mono">
          Open-Source Friendly • Runs Locally or on Bare-Metal Linux • BYOK Token Model
        </p>

        {/* ─── LIVE HERO CIRCUIT BREAKER SIMULATOR ─── */}
        <div id="simulator" className="mt-14 max-w-4xl mx-auto text-left rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-2xl overflow-hidden backdrop-blur animate-fade-up" style={{ animationDelay: "320ms" }}>
          {/* Terminal Titlebar */}
          <div className="px-5 py-3 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-xs font-mono text-zinc-400 pl-2 border-l border-zinc-800 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                cortexheal-gateway // live breaker inspection
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Test Scenario:</span>
              <button
                onClick={() => runSimulation("loop")}
                className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                Infinite Loop
              </button>
              <button
                onClick={() => runSimulation("budget")}
                className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1"
              >
                <Flame className="w-3 h-3" />
                Budget Spike
              </button>
              <button
                onClick={() => runSimulation("normal")}
                className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all flex items-center gap-1"
              >
                <Play className="w-3 h-3 text-emerald-400" />
                Clean Run
              </button>
            </div>
          </div>

          {/* Terminal Stream Body */}
          <div className="p-5 font-mono text-xs sm:text-[13px] min-h-[170px] space-y-1.5 bg-black/60">
            {simLogs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes("CIRCUIT BREAKER TRIPPED")
                    ? "text-red-400 font-bold bg-red-950/30 p-1.5 rounded border border-red-900/50"
                    : log.includes("BLOCKED") || log.includes("Saved")
                    ? "text-emerald-400 font-semibold"
                    : log.includes("matches 4th time")
                    ? "text-amber-400 font-semibold"
                    : "text-zinc-300"
                }
              >
                {log}
              </div>
            ))}
          </div>

          {/* Breaker Telemetry Status Footer */}
          <div className="px-5 py-2.5 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SLIDING_WINDOW: 4 steps • HASH: SHA-256
            </span>
            <span className="text-zinc-500">LATENCY: ≤ 24ms p50 (Mathematical check)</span>
          </div>
        </div>

        {/* Live Metrics Ribbons */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-4xl mx-auto text-left animate-fade-up" style={{ animationDelay: "400ms" }}>
          {[
            { label: "Breaker Trip Latency", value: "≤ 24ms p50", sub: "Mathematical Hash Equality" },
            { label: "LLMs In Safety Gate", value: "0 tokens", sub: "100% Deterministic / No Hallucinations" },
            { label: "Token Billing Model", value: "100% BYOK", sub: "Zero LLM markups to customers" },
            { label: "Audit Certification", value: "RFC JSON + CSV", sub: "Immutable SOC2 / HIPAA trails" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all">
              <span className="block text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                {label}
              </span>
              <span className="text-[18px] font-extrabold text-white font-mono tracking-tight mt-1 block">{value}</span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── INTERACTIVE RUNAWAY LOSS CALCULATOR ─── */}
      <section className="py-20 max-w-5xl mx-auto px-6 border-t border-zinc-850">
        <div className="p-8 sm:p-10 bg-zinc-900/80 border border-zinc-800 rounded-3xl shadow-xl backdrop-blur">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold mb-3">
                <Sliders className="w-3.5 h-3.5" /> ROI & Protection Estimator
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Calculate your rogue agent risk
              </h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                Autonomous agents in tool loops query LLMs recursively. Adjust your fleet parameters to see the runaway token bill CortexHeal eliminates.
              </p>

              {/* Sliders */}
              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-zinc-400">Active Autonomous Agents:</span>
                    <span className="text-white font-bold">{agentCount} agents</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={agentCount}
                    onChange={(e) => setAgentCount(Number(e.target.value))}
                    className="w-full accent-blue-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-zinc-400">Avg Tool Calls / Hour:</span>
                    <span className="text-white font-bold">{hourlyCalls} calls/hr</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="1000"
                    step="10"
                    value={hourlyCalls}
                    onChange={(e) => setHourlyCalls(Number(e.target.value))}
                    className="w-full accent-blue-500 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Calculation Output Card */}
            <div className="w-full lg:w-[360px] p-6 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  Estimated Rogue Token Waste Blocked
                </span>
                <div className="text-4xl font-extrabold text-emerald-400 font-mono tracking-tight">
                  ${estimatedSavedPerMonth.toLocaleString()} <span className="text-xs text-zinc-400">/ mo</span>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-850 space-y-2 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Halts loops on 4th repetition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Guards production DB from recursive writes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Instant Slack & PagerDuty notification</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenSignUp("Developer")}
                className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
              >
                Protect This Fleet Now
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Watchdog & Agent Queue Live Monitor ─── */}
      <section id="monitoring" className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Real-Time Telemetry
          </div>
          <h2 className="text-3xl sm:text-[38px] font-extrabold text-white tracking-tight leading-tight">
            Datadog Watchdog & PostHog grade APM
          </h2>
          <p className="text-sm text-zinc-400 mt-3">
            Interact with our simulated fleet below. Trigger runaway loops or budget spikes to see the circuit breaker intervene in under 24 milliseconds.
          </p>
        </div>

        <LiveMonitoringPreview />
      </section>

      {/* ─── How Safety Gate Works ─── */}
      <section id="architecture" className="py-20 max-w-5xl mx-auto px-6 border-t border-zinc-850">
        <SafetyDiagram />
      </section>

      {/* ─── Code Integration Section (Dual Mode) ─── */}
      <section className="py-24 max-w-5xl mx-auto px-6 border-t border-zinc-850">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-mono font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Dual Integration Architecture
            </p>
            <h2 className="text-3xl sm:text-[36px] font-extrabold text-white tracking-tight leading-tight mb-4">
              Onboard in 30 seconds without refactoring
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Choose between a zero-code OpenAI proxy (drop-in <code className="text-blue-400 font-mono">base_url</code> swap) or deep in-memory LangGraph state graph pause & resumption.
            </p>

            <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm mb-6">
              <button
                onClick={() => setActiveTab("proxy")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "proxy"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Zero-Code Proxy Gateway
              </button>
              <button
                onClick={() => setActiveTab("adapter")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "adapter"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                LangGraph Adapter
              </button>
            </div>

            <ul className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{activeTab === "proxy" ? "Works with LangChain, CrewAI, AutoGen, and raw OpenAI SDK" : "Physically suspends LangGraph DAG execution via interrupt()"}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{activeTab === "proxy" ? "BYOK token economics — CortexHeal incurs zero upstream LLM bills" : "Zero cold-restart required: resume state right where it halted"}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{activeTab === "proxy" ? "Inline budget enforcement: trips HTTP 429 when cap exceeded" : "Full audit logging with RFC JSON/CSV compliance exports"}</span>
              </li>
            </ul>
          </div>

          {/* Code Viewer Card */}
          <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="text-[11px] font-mono text-zinc-400 ml-2">
                  {activeTab === "proxy" ? "agent_worker.py (Proxy)" : "agent_graph.py (Native)"}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="p-5 font-mono text-[12px] leading-relaxed text-zinc-300 overflow-x-auto bg-black/60">
              <code>{activeTab === "proxy" ? proxySnippet : codeSnippet}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <PricingSection onSelectPlan={handleOpenSignUp} />

      {/* ─── Sign Up Modal ─── */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        defaultPlan={selectedPlan}
      />
    </div>
  );
}
