export default function RecoverySection() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[12px] font-bold text-[var(--brand)] uppercase tracking-wider block">
            03
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            A human decides what resumes
          </h2>
          <p className="text-[14px] text-[var(--muted)] leading-relaxed">
            When execution pauses, AgentFuse constructs a deterministic recovery plan backed by
            historical Bayesian frequency stats. An operator reviews the evidence and approves or
            rejects the action. Every decision is immutably logged to an audit trail.
          </p>
        </div>

        <div className="lg:col-span-7 border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] p-4 relative font-mono text-[12px] space-y-3">
          <span className="absolute top-3 right-3 text-[10px] text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
            Sample data
          </span>
          <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[var(--text)]">Action: RESUME</span>
              <span className="text-[var(--ok)] text-[11px]">Worked 8 of 10 times for this pattern</span>
            </div>
            <div className="flex gap-2 pt-2">
              <span className="px-2.5 py-1 rounded bg-[var(--text)] text-[var(--bg)] text-[11px] font-medium">
                Approve
              </span>
              <span className="px-2.5 py-1 rounded border border-[var(--border)] text-[var(--muted)] text-[11px]">
                Reject
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)] space-y-1">
            <div>[2026-11-22T19:40:02Z] PLAN_APPROVED by operator_2 (HUMAN): SUCCESS</div>
            <div>[2026-11-22T19:40:03Z] RESUMED by SYSTEM: SUCCESS</div>
          </div>
        </div>
      </div>
    </section>
  );
}
