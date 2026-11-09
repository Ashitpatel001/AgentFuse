import { Check, ShieldCheck, Zap, Server } from "lucide-react";

interface PricingSectionProps {
  onSelectPlan: (plan: string) => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const plans = [
    {
      name: "Developer",
      price: "$0",
      period: "forever",
      description: "Ideal for engineers prototyping local agent graphs with deterministic safety.",
      features: [
        "Up to 10 concurrent agents",
        "Deterministic stuck loop detection",
        "Deterministic budget ceilings ($1.00+)",
        "Zero LLMs in decision path (~25ms p50)",
        "LangGraph, CrewAI & AutoGen adapters",
        "Local Docker Compose & Bare Metal",
        "Community support & docs",
      ],
      cta: "Get Started Free",
      highlighted: false,
    },
    {
      name: "Team & Pro",
      price: "$49",
      period: "per month",
      description: "For engineering teams running production agent fleets requiring live watchdog alerts.",
      features: [
        "Up to 50 concurrent agents",
        "Real-time SSE event bus streaming",
        "Slack, PagerDuty & Opsgenie webhooks",
        "Human-in-the-loop recovery approval",
        "Multi-operator RBAC (Viewer, Operator, Admin)",
        "Automated pattern learning engine",
        "Audit trail export (CSV / JSON)",
        "Priority engineering support",
      ],
      cta: "Start 14-Day Pro Trial",
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Enterprise Bare Metal",
      price: "$499",
      period: "per instance / mo",
      description: "Self-hosted bare-metal deployment with zero cloud egress for high-compliance workloads.",
      features: [
        "Unlimited concurrent agent fleets",
        "Air-gapped bare metal deployment",
        "Zero data leaves your datacenter",
        "Direct Caddy TLS + Systemd orchestration",
        "Custom SHA-256 state matching policies",
        "Dedicated PostgreSQL & Redis tuning",
        "Custom alerting webhooks & SOAR integration",
        "24/7 dedicated engineering SLA",
      ],
      cta: "Deploy Bare Metal",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-slate-50/70 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-[11px] font-mono font-semibold text-blue-600 uppercase tracking-wider mb-3">
            Predictable Pricing
          </p>
          <h2 className="text-3xl sm:text-[36px] font-extrabold text-slate-900 tracking-tight leading-tight">
            Safety that saves more than it costs
          </h2>
          <p className="text-sm text-slate-500 mt-4">
            A single runaway agent can burn $500 in OpenAI tokens in minutes. CortexHeal pays for itself on day one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative bg-white rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 ${
                p.highlighted
                  ? "border-2 border-blue-600 shadow-xl shadow-blue-600/10 ring-1 ring-blue-600/20"
                  : "border border-slate-200/90 hover:border-slate-300 shadow-sm"
              }`}
            >
              {p.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
                  {p.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  {p.name === "Developer" && <Zap className="w-5 h-5 text-slate-400" />}
                  {p.name === "Team & Pro" && <ShieldCheck className="w-5 h-5 text-blue-600" />}
                  {p.name === "Enterprise Bare Metal" && <Server className="w-5 h-5 text-indigo-600" />}
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {p.price}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/{p.period}</span>
                </div>

                <p className="text-xs text-slate-500 mb-6 leading-relaxed min-h-[36px]">
                  {p.description}
                </p>

                <div className="h-px w-full bg-slate-100 mb-6" />

                <ul className="space-y-3 mb-8">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs text-slate-700">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onSelectPlan(p.name)}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wide transition-all ${
                  p.highlighted
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
