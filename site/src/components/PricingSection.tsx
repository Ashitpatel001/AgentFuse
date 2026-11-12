import { useState } from "react";
import { Check, Shield, Zap, Building2, Sparkles, Server } from "lucide-react";

interface PricingSectionProps {
  onSelectPlan?: (planName: string) => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Developer",
      desc: "For engineers prototyping agents locally or in pre-production test environments.",
      price: "$0",
      period: "forever free",
      badge: null,
      highlight: false,
      features: [
        "Up to 25,000 proxy requests / mo",
        "Deterministic Loop Circuit Breaker (≤24ms)",
        "Zero-code Proxy Gateway (/v1 drop-in)",
        "Native LangGraph & CrewAI Adapters",
        "In-Memory State Resumption",
        "Community Support",
      ],
      cta: "Get Started Free",
      planKey: "Developer",
    },
    {
      name: "Team & Production",
      desc: "For engineering teams running autonomous multi-agent workloads in production.",
      price: billingPeriod === "annual" ? "$159" : "$199",
      period: "per month",
      badge: "MOST POPULAR",
      highlight: true,
      features: [
        "Up to 500,000 proxy requests / mo",
        "Instant Slack Block Kit & PagerDuty alerts",
        "Datadog & PostHog grade Watchdog APM",
        "Human-in-the-Loop Recovery approval queue",
        "Custom hard budget caps per agent",
        "Team RBAC (Admin, Operator, Viewer)",
        "Priority Slack support channel",
      ],
      cta: "Start 14-Day Free Trial",
      planKey: "Team",
    },
    {
      name: "Enterprise Bare-Metal",
      desc: "Self-hosted behind your VPC firewall for strict compliance, zero data egress, and air-gapped security.",
      price: "Custom",
      period: "starts at $1,500/mo",
      badge: "VPC / ON-PREMISE",
      highlight: false,
      features: [
        "Unlimited requests & agents",
        "Self-hosted Docker or Bare-Metal Linux binaries",
        "Zero cloud egress — customer PII never leaves your VPC",
        "Immutable SOC2 & HIPAA compliant RFC JSON/CSV audit logs",
        "Custom cryptographic state detectors & policies",
        "Dedicated Solutions Architect & 99.99% SLA",
      ],
      cta: "Contact Enterprise Sales",
      planKey: "Enterprise",
    },
  ];

  return (
    <section id="pricing" className="py-24 max-w-6xl mx-auto px-6">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
          <Shield className="w-3.5 h-3.5 text-indigo-600" /> Transparent Enterprise Pricing
        </div>
        <h2 className="text-3xl sm:text-[38px] font-extrabold text-slate-900 tracking-tight leading-tight">
          Pays for itself the first time an agent loops
        </h2>
        <p className="text-sm text-slate-600 mt-3">
          A single runaway tool loop burns $300+ in OpenAI credits. CortexHeal stops it on step 4.
        </p>

        {/* Billing Toggle */}
        <div className="mt-7 inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              billingPeriod === "monthly"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              billingPeriod === "annual"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Annual
            <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 bg-white border ${
              p.highlight
                ? "border-indigo-600 shadow-xl shadow-indigo-600/10 ring-2 ring-indigo-600/20"
                : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
            }`}
          >
            {p.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider bg-indigo-600 text-white shadow-sm uppercase">
                  {p.badge}
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6 min-h-[34px] leading-relaxed">
                {p.desc}
              </p>

              <div className="mb-7 pb-6 border-b border-slate-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {p.price}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ {p.period}</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Included capabilities
                </span>
                {p.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onSelectPlan?.(p.planKey)}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                p.highlight
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
              }`}
            >
              {p.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
