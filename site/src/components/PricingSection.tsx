import { useState } from "react";
import { Check, Shield, Star, GitFork, Terminal, Copy, ArrowRight, ExternalLink, Sparkles, Heart } from "lucide-react";

interface PricingSectionProps {
  onSelectPlan?: (planName: string) => void;
}

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const [copied, setCopied] = useState(false);
  const quickstartCmd = "git clone https://github.com/Ashitpatel001/Cortexheal.git && cd Cortexheal && docker compose up -d";

  const handleCopy = () => {
    navigator.clipboard.writeText(quickstartCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const editions = [
    {
      name: "Community Edition",
      desc: "For individual engineers building and debugging autonomous agents locally.",
      price: "$0",
      period: "forever free",
      badge: "OPEN SOURCE",
      highlight: false,
      features: [
        "Unlimited local agent runs & traces",
        "Deterministic Loop Circuit Breaker (≤ 24ms)",
        "Zero-code Proxy Gateway (/v1 drop-in)",
        "Native LangGraph & CrewAI Adapters",
        "In-Memory State Resumption (interrupt)",
        "100% BYOK Token Model (zero markup)",
        "Apache 2.0 / MIT Licensed",
      ],
      cta: "Clone on GitHub",
      href: "https://github.com/Ashitpatel001/Cortexheal",
      actionKey: "Community",
    },
    {
      name: "Self-Hosted Fleet",
      desc: "For engineering teams running multi-agent workloads in staging or production.",
      price: "$0",
      period: "100% free forever",
      badge: "MOST POPULAR",
      highlight: true,
      features: [
        "Unlimited proxy throughput & agents",
        "Instant Slack Block Kit & PagerDuty alerts",
        "Datadog & PostHog grade Watchdog APM",
        "Human-in-the-Loop Recovery approval queue",
        "Configurable hard budget caps per agent",
        "Team RBAC (Admin, Operator, Viewer)",
        "Full PostgreSQL 15 & Redis state bus",
      ],
      cta: "Deploy with Docker",
      href: "https://github.com/Ashitpatel001/Cortexheal#quickstart",
      actionKey: "Fleet",
    },
    {
      name: "VPC Air-Gapped",
      desc: "Self-hosted on bare-metal behind your corporate firewall with strict zero-egress.",
      price: "$0",
      period: "free for enterprises",
      badge: "AIR-GAPPED",
      highlight: false,
      features: [
        "Zero cloud telemetry egress (100% private)",
        "Customer PII never touches external servers",
        "Immutable SOC2 & HIPAA compliant RFC JSON/CSV audit logs",
        "Custom cryptographic state detectors & policies",
        "Native systemd Linux binary deployment",
        "Caddy automatic TLS & reverse proxy ready",
        "Community & GitHub Discussions support",
      ],
      cta: "Read Bare-Metal Guide",
      href: "https://github.com/Ashitpatel001/Cortexheal/blob/main/DEPLOYMENT.md",
      actionKey: "Enterprise",
    },
  ];

  return (
    <section id="open-source" className="py-24 max-w-6xl mx-auto px-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> 100% Free & Open Source
        </div>
        <h2 className="text-3xl sm:text-[38px] font-extrabold text-slate-900 tracking-tight leading-tight">
          No paywalls. Free forever for developers & teams.
        </h2>
        <p className="text-sm text-slate-600 mt-3">
          CortexHeal is free and open-source software. Run it locally, deploy it with Docker Compose, or host it on your own bare-metal servers with zero telemetry lock-in.
        </p>
      </div>

      {/* GitHub Star & Quickstart Showcase Banner */}
      <div className="mb-14 p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-mono">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            <span>Built for the autonomous AI engineer community</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Support CortexHeal on GitHub
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Give us a star to support deterministic AI safety, keep up with new safety detectors, and join our open-source developer ecosystem.
          </p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 font-bold bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>2,840+ Stars</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              <GitFork className="w-4 h-4 text-slate-400" />
              <span>410+ Forks</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Apache 2.0 License</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
          <a
            href="https://github.com/Ashitpatel001/Cortexheal"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all shadow-md group"
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>Star on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs border border-white/15 transition-all"
            title="Copy 1-line docker quickstart"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-300" />
            <span>{copied ? "Command Copied!" : "Copy Docker Quickstart"}</span>
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 3 Free Edition Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {editions.map((ed) => (
          <div
            key={ed.name}
            className={`relative rounded-2xl p-7 flex flex-col justify-between transition-all duration-200 bg-white border ${
              ed.highlight
                ? "border-indigo-600 shadow-xl shadow-indigo-600/10 ring-2 ring-indigo-600/20"
                : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
            }`}
          >
            {ed.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider text-white shadow-sm uppercase ${
                  ed.highlight ? "bg-indigo-600" : "bg-slate-800"
                }`}>
                  {ed.badge}
                </span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900">{ed.name}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6 min-h-[34px] leading-relaxed">
                {ed.desc}
              </p>

              <div className="mb-7 pb-6 border-b border-slate-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {ed.price}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ {ed.period}</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Included capabilities
                </span>
                {ed.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <a
              href={ed.href}
              target="_blank"
              rel="noreferrer"
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                ed.highlight
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
              }`}
            >
              <span>{ed.cta}</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
