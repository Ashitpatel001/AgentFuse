import { useState, lazy, Suspense } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

// Lazy-loaded dashboard-component visuals & below-the-fold sections
const DashboardVisuals = lazy(() => import("../components/landing/DashboardVisuals"));
const FleetSection = lazy(() => import("../components/landing/FleetSection"));
const LoopsSection = lazy(() => import("../components/landing/LoopsSection"));
const RecoverySection = lazy(() => import("../components/landing/RecoverySection"));
const CalculatorSection = lazy(() => import("../components/landing/CalculatorSection"));
const QuickstartSection = lazy(() => import("../components/landing/QuickstartSection"));
const ComparisonSection = lazy(() => import("../components/landing/ComparisonSection"));
const FaqAndCtaSection = lazy(() => import("../components/landing/FaqAndCtaSection"));

export function LandingPage() {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [heroTab, setHeroTab] = useState<"fleet" | "incident" | "approve">("incident");

  const handleCopyPrompt = () => {
    const prompt = `Integrate AgentFuse deterministic safety and circuit breaker into this LangGraph project:

1. Install the agentfuse package:
   pip install agentfuse

2. Provide your API key as an environment variable:
   export AGENTFUSE_API_KEY="af_live_YOUR_KEY_HERE"

3. Attach the deterministic safety gate at your StateGraph entrance:
   from agentfuse import AgentFuse, LangGraphAdapter
   fuse = AgentFuse(adapter=LangGraphAdapter(agent_id="my-agent"))
   builder.add_node("safety_gate", fuse.safety_gate)
   builder.set_entry_point("safety_gate")
   builder.add_edge("safety_gate", "agent_worker")
   builder.add_edge("agent_worker", "safety_gate")

4. Compile and run your graph. Execution tool-telemetry and state transitions stream directly into the AgentFuse control plane console.`;

    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* HERO SECTION */}
      <section className="pt-16 sm:pt-24 max-w-6xl mx-auto px-6">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-mono text-[var(--muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
            <span>Alpha · self-hosted</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text)] leading-tight">
            Stop runaway agents. Deterministically.
          </h1>

          <p className="text-lg text-[var(--muted)] leading-relaxed max-w-2xl">
            AgentFuse is a real-time circuit breaker for AI agents. It pauses loops and runaway
            spend while they happen, and a human approves the resume.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#quickstart"
              className="px-4 py-2.5 rounded-[var(--radius-control)] bg-[var(--text)] text-[var(--bg)] font-medium text-[13px] hover:opacity-90 transition-opacity"
            >
              Get started
            </a>

            <button
              type="button"
              onClick={handleCopyPrompt}
              className="px-4 py-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] font-medium text-[13px] hover:bg-[var(--surface-3)] transition-colors inline-flex items-center gap-2"
            >
              {copiedPrompt ? (
                <Check className="w-4 h-4 text-[var(--ok)]" strokeWidth={1.5} />
              ) : (
                <Copy className="w-4 h-4 text-[var(--muted)]" strokeWidth={1.5} />
              )}
              <span>{copiedPrompt ? "Copied setup prompt" : "Copy setup prompt"}</span>
            </button>

            <a
              href="https://github.com/Ashitpatel001/AgentFuse"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-[var(--radius-control)] text-[var(--muted)] hover:text-[var(--text)] text-[13px] font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <span>GitHub repository</span>
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
            </a>
          </div>

          {/* "Works with" text chips (No logos) */}
          <div className="pt-4 flex flex-wrap items-center gap-2 text-[12px] font-mono text-[var(--muted)]">
            <span className="text-[var(--muted)] font-medium">Works with:</span>
            <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
              LangGraph (supported)
            </span>
            <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
              AutoGen (partial)
            </span>
            <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]">
              custom Python
            </span>
          </div>
        </div>

        {/* HERO VISUAL: Browser frame with tabs Fleet | Incident | Approve */}
        <div className="mt-12 border border-[var(--border-strong)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] shadow-sm overflow-hidden">
          {/* Browser frame title bar */}
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-strong)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-strong)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-strong)]" />
              <span className="ml-2 font-mono text-[11px] text-[var(--muted)]">
                agentfuse-console / live-triage
              </span>
            </div>

            {/* Frame Tabs */}
            <div className="flex items-center gap-1 bg-[var(--surface-3)] p-0.5 rounded-[var(--radius-control)] border border-[var(--border)] text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setHeroTab("fleet")}
                className={`px-2.5 py-0.5 rounded-[var(--radius-sm)] transition-colors ${
                  heroTab === "fleet"
                    ? "bg-[var(--surface-1)] text-[var(--text)] font-semibold shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Fleet
              </button>
              <button
                type="button"
                onClick={() => setHeroTab("incident")}
                className={`px-2.5 py-0.5 rounded-[var(--radius-sm)] transition-colors ${
                  heroTab === "incident"
                    ? "bg-[var(--surface-1)] text-[var(--text)] font-semibold shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Incident
              </button>
              <button
                type="button"
                onClick={() => setHeroTab("approve")}
                className={`px-2.5 py-0.5 rounded-[var(--radius-sm)] transition-colors ${
                  heroTab === "approve"
                    ? "bg-[var(--surface-1)] text-[var(--text)] font-semibold shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                Approve
              </button>
            </div>
          </div>

          {/* Dashboard Component Visuals (Lazy Loaded) */}
          <Suspense fallback={<div className="p-6 min-h-[160px] flex items-center justify-center font-mono text-[12px] text-[var(--muted)]">Loading preview...</div>}>
            <DashboardVisuals heroTab={heroTab} />
          </Suspense>
        </div>
      </section>

      {/* SECTION 01: Fleet */}
      <Suspense fallback={<div className="min-h-[120px]" />}>
        <FleetSection />
      </Suspense>

      {/* SECTION 02: Loops & Ceilings */}
      <Suspense fallback={<div className="min-h-[120px]" />}>
        <LoopsSection />
      </Suspense>

      {/* SECTION 03: Human Decision & Audit Trail */}
      <Suspense fallback={<div className="min-h-[120px]" />}>
        <RecoverySection />
      </Suspense>

      {/* SECTION 04: Exposure Calculator */}
      <Suspense fallback={<div className="min-h-[120px]" />}>
        <CalculatorSection />
      </Suspense>

      {/* SECTION 05: Self-host in minutes */}
      <Suspense fallback={<div className="min-h-[120px]" />}>
        <QuickstartSection />
      </Suspense>

      {/* CONTRAST & KNOWN LIMITS */}
      <Suspense fallback={<div className="min-h-[120px]" />}>
        <ComparisonSection />
      </Suspense>

      {/* FAQ & FINAL CTA */}
      <Suspense fallback={<div className="min-h-[120px]" />}>
        <FaqAndCtaSection />
      </Suspense>
    </div>
  );
}
