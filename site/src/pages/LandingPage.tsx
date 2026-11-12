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
  AlertTriangle,
  ChevronRight,
  Server,
  Star,
  Key
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

const supportedFrameworks = [
  { name: "LangGraph", desc: "Native interrupt() State Resumption", tag: "First-Class" },
  { name: "CrewAI", desc: "Multi-Agent Role Firewalls", tag: "Zero-Code" },
  { name: "Microsoft AutoGen", desc: "Multi-Agent Turn Circuit Breaker", tag: "Supported" },
  { name: "OpenAI SDK", desc: "Direct /v1 Proxy Gateway", tag: "Drop-in" },
  { name: "Anthropic Claude", desc: "Tool Use Loop Interception", tag: "Drop-in" },
  { name: "AWS Bedrock", desc: "VPC Air-Gapped Gateway", tag: "Enterprise" },
];

export function LandingPage() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"proxy" | "adapter">("proxy");
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Developer");

  // Interactive Live Simulator State
  const [simStep, setSimStep] = useState<"idle" | "running" | "tripped" | "budget_tripped">("idle");
  const [simLogs, setSimLogs] = useState<string[]>([
    "System nominal. Select a simulation below to observe real-time circuit breaking."
  ]);

  // Interactive Runaway Loss Calculator
  const [agentCount, setAgentCount] = useState(10);
  const [hourlyCalls, setHourlyCalls] = useState(120);

  // Math: Estimated monthly runaway token risk prevented
  const estimatedSavedPerMonth = Math.round(agentCount * hourlyCalls * 0.0028 * 24 * 30 * 0.08);

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
    <div className="relative overflow-hidden bg-white text-slate-900 min-h-screen">
      <div className="absolute inset-0 grid-bg-light pointer-events-none opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] gradient-datadog-hero pointer-events-none" />

      {/* ─── Hero Section (Datadog Style) ─── */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-20 max-w-6xl mx-auto px-6 text-center">
        {/* Eyebrow Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/80 text-indigo-700 text-[11px] font-mono font-semibold mb-7 shadow-sm animate-fade-up">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>NEW: Watchdog AI Automated Circuit Breaker • 100% Free & Open Source</span>
          <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-[62px] font-extrabold text-slate-900 tracking-tight leading-[1.08] max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: "80ms" }}>
          Modern Safety & Observability for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700">
            Autonomous AI Agents
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-[17px] sm:text-[19px] text-slate-600 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "160ms" }}>
          Every time an enterprise agent gets stuck in a tool loop, it burns $200–$500 in tokens and risks corrupting production databases. CortexHeal is the deterministic circuit breaker that stops loops in <strong>24 milliseconds</strong> — <span className="text-slate-900 font-semibold">zero LLM hallucinations in the safety path.</span>
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <a
            href="https://github.com/Ashitpatel001/Cortexheal"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-[14px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/25 hover:shadow-slate-900/35 transition-all hover:-translate-y-0.5 group"
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Star on GitHub</span>
            <span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-mono font-bold">2.8k</span>
          </a>
          
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-[14px] font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all"
          >
            <Activity className="w-4 h-4 text-indigo-600" />
            Launch Live Console
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <button
            onClick={() => handleOpenSignUp("Free Developer Key")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 text-[14px] font-medium text-slate-700 hover:text-slate-900 transition-colors border border-slate-200 hover:border-slate-300 rounded-xl bg-white shadow-2xs"
          >
            <Key className="w-4 h-4 text-indigo-600" />
            Get Free Key
          </button>
        </div>

        <p className="mt-4 text-[12px] text-slate-500 font-mono">
          100% Free & Open Source (Apache 2.0) • Air-Gapped Bare-Metal Ready • Zero Token Markup
        </p>

        {/* ─── LIVE HERO CIRCUIT BREAKER SIMULATOR (Datadog style interactive console) ─── */}
        <div id="breaker" className="mt-14 max-w-4xl mx-auto text-left rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 overflow-hidden animate-fade-up" style={{ animationDelay: "320ms" }}>
          {/* Header Titlebar */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              </div>
              <span className="text-xs font-mono font-medium text-slate-700 pl-2 border-l border-slate-200 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                cortexheal-gateway // live breaker inspection
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Test Probe:</span>
              <button
                onClick={() => runSimulation("loop")}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-rose-600" />
                Trigger Loop
              </button>
              <button
                onClick={() => runSimulation("budget")}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1"
              >
                <Flame className="w-3 h-3 text-amber-600" />
                Budget Spike
              </button>
              <button
                onClick={() => runSimulation("normal")}
                className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1"
              >
                <Play className="w-3 h-3 text-emerald-600" />
                Normal
              </button>
            </div>
          </div>

          {/* Terminal Stream View */}
          <div className="p-5 font-mono text-xs sm:text-[13px] min-h-[160px] space-y-1.5 bg-slate-900 text-slate-200">
            {simLogs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes("CIRCUIT BREAKER TRIPPED")
                    ? "text-rose-400 font-bold bg-rose-950/40 p-1.5 rounded border border-rose-900/60"
                    : log.includes("BLOCKED") || log.includes("Saved")
                    ? "text-emerald-400 font-semibold"
                    : log.includes("matches 4th time")
                    ? "text-amber-400 font-semibold"
                    : "text-slate-300"
                }
              >
                {log}
              </div>
            ))}
          </div>

          {/* Breaker Telemetry Status Footer */}
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SLIDING_WINDOW: 4 steps • HASH: SHA-256
            </span>
            <span className="text-slate-500">TRIP LATENCY: ≤ 24ms p50 (Zero LLM overhead)</span>
          </div>
        </div>

        {/* Live Metrics Ribbons */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-4xl mx-auto text-left animate-fade-up" style={{ animationDelay: "400ms" }}>
          {[
            { label: "Breaker Trip Latency", value: "≤ 24ms p50", sub: "Mathematical Hash Equality" },
            { label: "LLMs In Safety Path", value: "0 tokens", sub: "100% Deterministic / No Hallucinations" },
            { label: "Token Economics", value: "100% BYOK", sub: "Zero LLM markups to customers" },
            { label: "Audit Format", value: "RFC JSON + CSV", sub: "Per-tenant immutable SOC2 trail" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-sm hover:border-slate-300 hover:shadow-md transition-all">
              <span className="block text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
                {label}
              </span>
              <span className="text-[18px] font-extrabold text-slate-900 font-mono tracking-tight mt-1 block">{value}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">{sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SUPPORTED FRAMEWORKS (Datadog style logo cloud) ─── */}
      <section id="frameworks" className="py-16 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Universal Protection For Any Agent Architecture
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {supportedFrameworks.map((fw) => (
              <div key={fw.name} className="p-4 bg-white border border-slate-200/80 rounded-xl text-center shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase block w-max mx-auto mb-2">
                  {fw.tag}
                </span>
                <span className="text-sm font-bold text-slate-900 block">{fw.name}</span>
                <span className="text-[10px] text-slate-500 block mt-1 leading-tight">{fw.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE RUNAWAY LOSS CALCULATOR (Datadog style interactive tool) ─── */}
      <section id="calculator" className="py-20 max-w-5xl mx-auto px-6">
        <div className="p-8 sm:p-10 bg-white border border-slate-200/90 rounded-3xl shadow-lg shadow-slate-100">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-semibold mb-3">
                <Sliders className="w-3.5 h-3.5" /> ROI & Risk Estimator
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Calculate your rogue agent risk
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Autonomous agents in tool loops query LLMs recursively. Adjust your fleet parameters to see the runaway token bill CortexHeal eliminates.
              </p>

              {/* Sliders */}
              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-600">Active Autonomous Agents:</span>
                    <span className="text-slate-900 font-bold">{agentCount} agents</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={agentCount}
                    onChange={(e) => setAgentCount(Number(e.target.value))}
                    className="w-full accent-indigo-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-600">Avg Tool Calls / Hour:</span>
                    <span className="text-slate-900 font-bold">{hourlyCalls} calls/hr</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="1000"
                    step="10"
                    value={hourlyCalls}
                    onChange={(e) => setHourlyCalls(Number(e.target.value))}
                    className="w-full accent-indigo-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Output Card */}
            <div className="w-full lg:w-[360px] p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                  Estimated Rogue Token Waste Blocked
                </span>
                <div className="text-4xl font-extrabold text-indigo-700 font-mono tracking-tight">
                  ${estimatedSavedPerMonth.toLocaleString()} <span className="text-xs text-slate-500">/ mo</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Halts loops on 4th repetition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Guards production DB from recursive writes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Instant Slack & PagerDuty notification</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenSignUp("Free Fleet")}
                className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25"
              >
                Protect This Fleet (100% Free)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WATCHDOG LIVE MONITOR (Datadog APM Style) ─── */}
      <section id="watchdog" className="py-20 max-w-6xl mx-auto px-6 border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Watchdog AI Telemetry
          </div>
          <h2 className="text-3xl sm:text-[38px] font-extrabold text-slate-900 tracking-tight leading-tight">
            Datadog Watchdog & APM observability for agents
          </h2>
          <p className="text-sm text-slate-600 mt-3">
            Interact with our simulated fleet below. Trigger runaway loops or budget spikes to see the circuit breaker intervene in under 24 milliseconds.
          </p>
        </div>

        <LiveMonitoringPreview />
      </section>

      {/* ─── HOW IT WORKS ARCHITECTURE ─── */}
      <section id="architecture" className="py-20 max-w-5xl mx-auto px-6 border-t border-slate-200/80">
        <SafetyDiagram />
      </section>

      {/* ─── DUAL INTEGRATION ARCHITECTURE ─── */}
      <section className="py-24 max-w-5xl mx-auto px-6 border-t border-slate-200/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[11px] font-mono font-semibold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Dual Integration Modes
            </p>
            <h2 className="text-3xl sm:text-[36px] font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
              Onboard in 30 seconds without refactoring
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Choose between a zero-code OpenAI proxy (drop-in <code className="text-indigo-600 font-mono font-semibold">base_url</code> swap) or deep in-memory LangGraph state graph pause & resumption.
            </p>

            <div className="flex gap-2 p-1 bg-slate-100 border border-slate-200 rounded-xl max-w-sm mb-6">
              <button
                onClick={() => setActiveTab("proxy")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "proxy"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Zero-Code Proxy Gateway
              </button>
              <button
                onClick={() => setActiveTab("adapter")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === "adapter"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                LangGraph Adapter
              </button>
            </div>

            <ul className="space-y-3 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{activeTab === "proxy" ? "Works with LangChain, CrewAI, AutoGen, and raw OpenAI SDK" : "Physically suspends LangGraph DAG execution via interrupt()"}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{activeTab === "proxy" ? "BYOK token economics — CortexHeal incurs zero upstream LLM bills" : "Zero cold-restart required: resume state right where it halted"}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{activeTab === "proxy" ? "Inline budget enforcement: trips HTTP 429 when cap exceeded" : "Full audit logging with RFC JSON/CSV compliance exports"}</span>
              </li>
            </ul>
          </div>

          {/* Code Viewer Card */}
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-white">
            <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                <span className="text-[11px] font-mono text-slate-400 ml-2">
                  {activeTab === "proxy" ? "agent_worker.py (Proxy)" : "agent_graph.py (Native)"}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="p-5 font-mono text-[12px] leading-relaxed text-slate-200 overflow-x-auto bg-black/60">
              <code>{activeTab === "proxy" ? proxySnippet : codeSnippet}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ─── PRICING SECTION ─── */}
      <PricingSection onSelectPlan={handleOpenSignUp} />

      {/* ─── SIGN UP MODAL ─── */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        defaultPlan={selectedPlan}
      />
    </div>
  );
}
