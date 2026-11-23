export default function FleetSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[12px] font-bold text-[var(--brand)] uppercase tracking-wider block">
            01
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            See every agent run
          </h2>
          <p className="text-[14px] text-[var(--muted)] leading-relaxed">
            Track execution state across autonomous workers in one dense table. Observe running,
            paused, and completed runs alongside live spend attribution and active circuit breaker modes.
          </p>
        </div>

        <div className="lg:col-span-7 border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] p-4 relative font-mono text-[12px]">
          <span className="absolute top-3 right-3 text-[10px] text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
            Sample data
          </span>
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-5 text-[10px] text-[var(--muted)] uppercase border-b border-[var(--border)] pb-2 font-semibold">
              <div>Agent ID</div>
              <div>Status</div>
              <div>Framework</div>
              <div>Active Run</div>
              <div className="text-right">Spend</div>
            </div>
            <div className="grid grid-cols-5 py-1.5 border-b border-[var(--border)] items-center">
              <div className="font-semibold text-[var(--text)]">support_agent</div>
              <div className="text-[var(--critical)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--critical)]" /> paused
              </div>
              <div className="text-[var(--muted)]">LangGraph</div>
              <div className="text-[var(--info)]">run_7c12a...</div>
              <div className="text-right tabular-nums">$0.1800</div>
            </div>
            <div className="grid grid-cols-5 py-1.5 items-center">
              <div className="font-semibold text-[var(--text)]">triage_worker</div>
              <div className="text-[var(--ok)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" /> running
              </div>
              <div className="text-[var(--muted)]">LangGraph</div>
              <div className="text-[var(--info)]">run_9b44f...</div>
              <div className="text-right tabular-nums">$0.0420</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
