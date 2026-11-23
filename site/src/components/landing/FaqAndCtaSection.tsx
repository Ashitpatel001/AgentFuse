import { Link } from "react-router-dom";

export default function FaqAndCtaSection() {
  return (
    <>
      {/* FAQ (5 questions) */}
      <section className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
        <div className="max-w-3xl space-y-3 mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-4 max-w-3xl">
          <div className="p-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-1.5">
            <h3 className="font-semibold text-[14px] text-[var(--text)]">
              Does AgentFuse call an LLM to decide when an agent stops?
            </h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
              No. AgentFuse uses zero LLMs in the safety decision path. Decisions are purely deterministic,
              evaluated through SHA-256 state hashing and fixed repetition thresholds in under 24ms.
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-1.5">
            <h3 className="font-semibold text-[14px] text-[var(--text)]">
              What happens to the agent process when an incident trips?
            </h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
              In LangGraph, the safety gate invokes the native interrupt() mechanism, cleanly freezing
              graph state and persisting a checkpoint without crashing the process. In proxy mode,
              AgentFuse returns an HTTP 429 response before dispatching the request upstream.
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-1.5">
            <h3 className="font-semibold text-[14px] text-[var(--text)]">
              How does human approval work?
            </h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
              When an incident trips, an operator inspects the failure evidence and proposed recovery
              action in the console or through the REST API. Clicking Approve executes the verified plan
              and resumes the agent run.
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-1.5">
            <h3 className="font-semibold text-[14px] text-[var(--text)]">
              What frameworks are supported?
            </h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
              LangGraph is fully supported via the in-process LangGraphAdapter. AutoGen is supported via
              turn-interception wrappers. Custom Python agents can integrate directly using the client SDK
              or through the standard OpenAI-compatible proxy gateway.
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-1.5">
            <h3 className="font-semibold text-[14px] text-[var(--text)]">
              Can I run AgentFuse air-gapped on private servers?
            </h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
              Yes. AgentFuse is 100% self-hosted and distributed under the Apache-2.0 license. It requires
              only a PostgreSQL database and an optional Redis instance. There are zero external telemetry
              pings or third-party cloud dependencies.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
        <div className="p-8 sm:p-12 border border-[var(--border-strong)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] text-center max-w-3xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            Run autonomous agents without runaway loops.
          </h2>
          <p className="text-[14px] text-[var(--muted)] max-w-xl mx-auto">
            Self-host the control plane on your own infrastructure or request access for hosted evaluations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#quickstart"
              className="px-4 py-2 rounded-[var(--radius-control)] bg-[var(--text)] text-[var(--bg)] font-medium text-[13px] hover:opacity-90 transition-opacity"
            >
              Get started
            </a>
            <Link
              to="/docs"
              className="px-4 py-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] font-medium text-[13px] hover:bg-[var(--surface-3)] transition-colors"
            >
              Read documentation
            </Link>
            <a
              href="mailto:access@agentfuse.com?subject=Hosted%20Access%20Request"
              className="px-4 py-2 rounded-[var(--radius-control)] text-[var(--muted)] hover:text-[var(--text)] font-medium text-[13px] transition-colors"
            >
              Request hosted access
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
