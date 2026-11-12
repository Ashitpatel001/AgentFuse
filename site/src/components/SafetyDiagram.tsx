import { useState, useEffect } from "react";
import { Play, ShieldAlert, Cpu, CheckCircle2, Zap, Terminal, ArrowRight } from "lucide-react";

const steps = [
  {
    title: "Zero-Latency Interception",
    desc: "Agent calls POST /v1/chat/completions. The gateway fingerprints arguments before hitting upstream LLM.",
    badge: "GATEWAY",
    icon: Play,
    detail: "POST /v1/chat/completions → agent: support_tier2, model: gpt-4o, prompt_tokens: 3,420",
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-100",
    activeBorder: "border-indigo-600 bg-indigo-50/40"
  },
  {
    title: "Cryptographic SHA-256 Hashing",
    desc: "Deterministic sliding-window engine compares input/output state tuples in under 1 millisecond.",
    badge: "DETERMINISTIC",
    icon: Cpu,
    detail: "sha256(tools + args) == 5550b1e1... → MATCH (count: 4/4 threshold breached)",
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-100",
    activeBorder: "border-purple-600 bg-purple-50/40"
  },
  {
    title: "Instant Circuit Breaking",
    desc: "Threshold breached. The gateway aborts before upstream LLM contact, returning HTTP 429 in 24ms.",
    badge: "24MS BREAKER",
    icon: ShieldAlert,
    detail: "HTTP 429 { code: 'STUCK_LOOP_TRIPPED', action: 'MODIFY_CONTEXT' } • Saved $3.80",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-100",
    activeBorder: "border-rose-600 bg-rose-50/40"
  },
  {
    title: "Human Triage & State Resumption",
    desc: "Operator approves auto-generated prompt repair. Agent resumes execution with zero cold-restarts.",
    badge: "VERIFIED",
    icon: CheckCircle2,
    detail: "PLAN APPROVED by engineer → status: RUNNING → verified completion (AuditEvent #8142)",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-100",
    activeBorder: "border-emerald-600 bg-emerald-50/40"
  },
];

export function SafetyDiagram() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % 4), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_4px_25px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-indigo-600 uppercase tracking-wider mb-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            Deterministic Protection Architecture
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            How CortexHeal Halts Runaway Loops in 4 Steps
          </h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Mathematical Guarantee (0 LLMs in safety path)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = active === idx;
          return (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              className={`text-left rounded-xl p-5 border transition-all duration-200 ${
                isActive
                  ? `${step.activeBorder} shadow-sm ring-1 ring-indigo-500/20`
                  : "border-slate-200/80 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className={`p-2 rounded-lg border ${step.bg} ${step.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 uppercase">
                  {step.badge}
                </span>
              </div>
              <h4 className="text-[13px] font-bold text-slate-900 mb-1.5">
                {idx + 1}. {step.title}
              </h4>
              <p className="text-[12px] text-slate-500 leading-relaxed">{step.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 p-4 bg-slate-900 rounded-xl font-mono text-[12px] overflow-x-auto border border-slate-800 shadow-inner text-white">
        <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 mb-2">
          <span className="flex items-center gap-2 text-slate-300 font-semibold">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            STAGE {active + 1} OF 4 TELEMETRY PROBE
          </span>
          <span className="text-[10px] text-slate-400 font-mono">decision latency: 18ms p50</span>
        </div>
        <p className="text-emerald-400 font-medium">
          <span className="text-slate-500 select-none mr-2">&gt;</span>
          {steps[active].detail}
        </p>
      </div>
    </div>
  );
}
