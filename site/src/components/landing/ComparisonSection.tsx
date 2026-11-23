export default function ComparisonSection() {
  return (
    <>
      {/* CONTRAST: How it is different */}
      <section className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
        <div className="max-w-3xl space-y-3 mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            How it is different
          </h2>
          <p className="text-[14px] text-[var(--muted)] leading-relaxed">
            A architectural contrast between post-execution analysis and runtime enforcement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] space-y-3">
            <h3 className="font-mono text-[13px] font-bold text-[var(--muted)] uppercase tracking-wider">
              Post-execution log analyzers
            </h3>
            <ul className="space-y-2 text-[13px] text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--critical)] shrink-0">•</span>
                <span>Operates after the run finishes; token costs are already incurred.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--critical)] shrink-0">•</span>
                <span>Relies on LLM-as-a-judge evaluators that can hallucinate or fail under provider outages.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--critical)] shrink-0">•</span>
                <span>Evaluation adds 800ms to 2500ms of external LLM roundtrip latency.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--critical)] shrink-0">•</span>
                <span>Cannot physically pause an in-flight LangGraph or AutoGen workflow.</span>
              </li>
            </ul>
          </div>

          <div className="p-5 border border-[var(--border-strong)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] space-y-3">
            <h3 className="font-mono text-[13px] font-bold text-[var(--brand)] uppercase tracking-wider">
              AgentFuse runtime enforcement
            </h3>
            <ul className="space-y-2 text-[13px] text-[var(--text)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--ok)] shrink-0">•</span>
                <span>Enforces during the run before downstream calls execute; halts spend at $0 waste.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--ok)] shrink-0">•</span>
                <span>100% deterministic rules using SHA-256 state digests and integer repetition ceilings.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--ok)] shrink-0">•</span>
                <span>Zero LLM calls in decision path; evaluated in under 24ms.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--ok)] shrink-0">•</span>
                <span>Native LangGraph interrupt() nodes cleanly freeze state for human review.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* KNOWN LIMITS */}
      <section className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
        <div className="max-w-3xl space-y-3 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">
            Known limits
          </h2>
          <p className="text-[13px] text-[var(--muted)] leading-relaxed">
            Explicit technical boundaries of the current v0.1.0 release.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px] font-mono text-[var(--muted)]">
          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)]">
            <strong className="text-[var(--text)] block mb-1">Application layer only</strong>
            No eBPF, kernel tracing, or container sandboxing. Protection operates within the Python agent process or HTTP proxy.
          </div>
          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)]">
            <strong className="text-[var(--text)] block mb-1">Exact signature matching</strong>
            Loop detection currently matches identical argument and response digests. Semantic clustering is planned for v0.2.0.
          </div>
          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)]">
            <strong className="text-[var(--text)] block mb-1">Manual node wiring</strong>
            In-process LangGraph adapter requires adding the safety gate node to your graph compilation.
          </div>
          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)]">
            <strong className="text-[var(--text)] block mb-1">Single-worker state default</strong>
            Proxy state is in-process per worker by default. Redis pub/sub is recommended for horizontal scaling.
          </div>
        </div>
      </section>
    </>
  );
}
