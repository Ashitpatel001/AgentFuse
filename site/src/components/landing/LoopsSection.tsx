export default function LoopsSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-3">
          <span className="font-mono text-[12px] font-bold text-[var(--brand)] uppercase tracking-wider block">
            02
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            Stop loops while they happen
          </h2>
          <p className="text-[14px] text-[var(--muted)] leading-relaxed">
            AgentFuse detects exact tool call repeats and budget breaches in real time. It computes
            cryptographic SHA-256 digests over argument and response payloads, halting loops before
            the next upstream call is sent.
          </p>
        </div>

        <div className="lg:col-span-7 border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] p-4 relative font-mono text-[12px] space-y-3">
          <span className="absolute top-3 right-3 text-[10px] text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)]">
            Sample data
          </span>
          <div className="text-[11px] text-[var(--muted)] uppercase font-semibold">
            Why it tripped
          </div>
          <div className="p-3 rounded bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between">
              <span>Rule: stuck_loop_detector</span>
              <span className="text-[var(--critical)] font-bold">4 / 4 repetitions</span>
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              Tool: fetch_user_record • Args hash: c912f0a1 • Response hash: 00b45f12
            </div>
            <div className="pt-2 border-t border-[var(--border)] text-right text-[11px] text-[var(--muted)]">
              Decided by a deterministic rule. No LLM involved.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
