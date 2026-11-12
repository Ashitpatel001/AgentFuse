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
      desc: "For engineers prototyping agents locally or in development environments.",
      price: "$0",
      period: "forever free",
      badge: null,
      highlight: false,
      features: [
        "Up to 25,000 requests / mo",
        "Deterministic Loop Circuit Breaker (≤24ms)",
        "Zero-code Proxy Gateway (/v1)",
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
        "Up to 500,000 requests / mo",
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
          <Shield className="w-3.5 h-3.5" /> Predictable Pricing
        </div>
        <h2 className="text-3xl sm:text-[38px] font-extrabold text-white tracking-tight leading-tight">
          Pays for itself the first time an agent loops
        </h2>
        <p className="text-sm text-zinc-400 mt-3">
          A single runaway tool loop burns $300+ in OpenAI credits. CortexHeal stops it on step 4.
        </p>

        {/* Billing Toggle */}
        <div className="mt-7 inline-flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              billingPeriod === "monthly"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              billingPeriod === "annual"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Annual
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 border ${
              p.highlight
                ? "bg-zinc-900/90 border-blue-500/50 shadow-2xl shadow-blue-900/20 ring-1 ring-blue-500/30"
                : "bg-zinc-900/50 border-zinc-800/90 hover:border-zinc-700"
            }`}
          >
            {p.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider bg-blue-600 text-white shadow-sm uppercase">
                  {p.badge}
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{p.name}</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-6 min-h-[34px] leading-relaxed">
                {p.desc}
              </p>

              <div className="mb-7 pb-6 border-b border-zinc-800">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                    {p.price}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">/ {p.period}</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                  Included capabilities
                </span>
                {p.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onSelectPlan?.(p.planKey)}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                p.highlight
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                  : "bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 hover:border-zinc-600"
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
