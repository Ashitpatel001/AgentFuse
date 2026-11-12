import { useState, useEffect } from "react";
import { Play, ShieldAlert, Cpu, CheckCircle2, Zap, ArrowRight, Terminal } from "lucide-react";

const steps = [
  {
    title: "Zero-Latency Interception",
    desc: "Agent calls POST /v1/chat/completions. The gateway fingerprints arguments before hitting upstream LLM.",
    badge: "GATEWAY",
    icon: Play,
    detail: "POST /v1/chat/completions → agent: support_tier2, model: gpt-4o, prompt_tokens: 3,420",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20"
  },
  {
    title: "Cryptographic SHA-256 Hashing",
    desc: "Deterministic sliding-window engine compares input/output state tuples in under 1 millisecond.",
    badge: "DETERMINISTIC",
    icon: Cpu,
    detail: "sha256(tools + args) == 5550b1e1... → MATCH (count: 4/4 threshold)",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20"
  },
  {
    title: "Instant Circuit Breaking",
    desc: "Threshold breached. The gateway aborts before upstream LLM contact, returning HTTP 429 in 24ms.",
    badge: "24MS BREAKER",
    icon: ShieldAlert,
    detail: "HTTP 429 { code: 'STUCK_LOOP_TRIPPED', action: 'MODIFY_CONTEXT' } • Saved $3.80",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20"
  },
  {
    title: "Human Triage & State Resumption",
    desc: "Operator approves auto-generated prompt repair. Agent resumes execution with zero cold-restarts.",
    badge: "VERIFIED",
    icon: CheckCircle2,
    detail: "PLAN APPROVED by engineer → status: RUNNING → verified completion (AuditEvent #8142)",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20"
  },
];

export function SafetyDiagram() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % 4), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-blue-400 uppercase tracking-wider mb-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            Deterministic Protection Architecture
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            How CortexHeal Halts Runaways in 4 Steps
          </h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Mathematical Guarantee (0 LLMs in loop)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = active === idx;
          return (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              className={`text-left rounded-xl p-5 border transition-all duration-200 ${
                isActive
                  ? "border-blue-500/50 bg-blue-950/20 shadow-lg ring-1 ring-blue-500/30"
                  : "border-zinc-800/80 hover:border-zinc-700 bg-zinc-950/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className={`p-2 rounded-lg border ${step.bg} ${step.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 uppercase">
                  {step.badge}
                </span>
              </div>
              <h4 className="text-[13px] font-bold text-white mb-1.5">
                {idx + 1}. {step.title}
              </h4>
              <p className="text-[12px] text-zinc-400 leading-relaxed">{step.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 p-4 bg-zinc-950 rounded-xl font-mono text-[12px] overflow-x-auto border border-zinc-800 shadow-inner">
        <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-2 mb-2">
          <span className="flex items-center gap-2 text-zinc-300 font-semibold">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            STAGE {active + 1} OF 4 TELEMETRY PROBE
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">decision latency: 18ms p50</span>
        </div>
        <p className="text-emerald-400 font-medium">
          <span className="text-zinc-600 select-none mr-2">$</span>
          {steps[active].detail}
        </p>
      </div>
    </div>
  );
}
