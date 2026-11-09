import { useState, useEffect } from "react";
import { Play, ShieldAlert, Cpu, CheckCircle2, Zap } from "lucide-react";

const steps = [
  {
    title: "Telemetry Ingestion",
    desc: "Agent emits structured tool-call and token events via the adapter.",
    badge: "STREAMING",
    icon: Play,
    detail: "POST /events → seq: 4, tool: query_db, tokens: 1,240",
  },
  {
    title: "Hash Comparison",
    desc: "SHA-256 normalized hash detects state repetitions and cost accumulation in sub-millisecond time.",
    badge: "DETERMINISTIC",
    icon: Cpu,
    detail: "hash(args) == hash(prev_args) → repetition 4/4 breached",
  },
  {
    title: "Circuit Breaker",
    desc: "Threshold exceeded. Deterministic policy halts the run immediately — zero LLMs consulted.",
    badge: "AUTO-PAUSE",
    icon: ShieldAlert,
    detail: "STATUS → PAUSED | severity: CRITICAL | latency: 0.8ms",
  },
  {
    title: "Human Recovery",
    desc: "Operator reviews diagnosis, approves recovery plan, and the agent resumes on a verified state.",
    badge: "VERIFIED",
    icon: CheckCircle2,
    detail: "PLAN: MODIFY_CONTEXT → approved → RESUMED → COMPLETED",
  },
];

export function SafetyDiagram() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % 4), 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <Zap className="w-3 h-3" /> How It Works
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Deterministic Safety in Four Steps
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
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
                  ? "border-blue-600/40 bg-blue-50/30 shadow-sm ring-1 ring-blue-600/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-1.5 rounded-lg ${
                    isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 uppercase">
                  {step.badge}
                </span>
              </div>
              <h4 className="text-[13px] font-semibold text-slate-900 mb-1">
                {idx + 1}. {step.title}
              </h4>
              <p className="text-[12px] text-slate-500 leading-relaxed">{step.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 p-4 bg-slate-900 rounded-xl font-mono text-[12px] overflow-x-auto border border-slate-800">
        <div className="flex items-center justify-between text-slate-500 border-b border-slate-800 pb-2 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            STEP {active + 1}/4
          </span>
          <span className="text-[10px] text-slate-600">pipeline latency: ~26ms p50</span>
        </div>
        <p className="text-emerald-400 font-medium">&gt; {steps[active].detail}</p>
      </div>
    </div>
  );
}
