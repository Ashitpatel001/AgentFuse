interface DashboardVisualsProps {
  heroTab: "fleet" | "incident" | "approve";
}

export default function DashboardVisuals({ heroTab }: DashboardVisualsProps) {
  return (
    <div className="p-6 relative">
      <div className="absolute top-4 right-4">
        <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[10px] text-[var(--muted)]">
          Sample data
        </span>
      </div>

      {heroTab === "fleet" && (
        <div className="space-y-3 font-mono text-[12px]">
          <div className="grid grid-cols-6 py-2 px-3 border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] font-semibold uppercase text-[10px]">
            <div>Agent</div>
            <div>Status</div>
            <div>Protection</div>
            <div>Framework</div>
            <div>Current Run</div>
            <div className="text-right">Spend</div>
          </div>
          <div className="grid grid-cols-6 py-2 px-3 border-b border-[var(--border)] text-[var(--text)]">
            <div className="font-semibold">support-router</div>
            <div className="flex items-center gap-1.5 text-[var(--critical)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--critical)]" />
              PAUSED
            </div>
            <div>ACTIVE</div>
            <div className="text-[var(--muted)]">LangGraph</div>
            <div className="text-[var(--info)]">run_a8f93e...</div>
            <div className="text-right tabular-nums">$0.2410</div>
          </div>
          <div className="grid grid-cols-6 py-2 px-3 border-b border-[var(--border)] text-[var(--text)]">
            <div className="font-semibold">code-reviewer</div>
            <div className="flex items-center gap-1.5 text-[var(--ok)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
              RUNNING
            </div>
            <div>ACTIVE</div>
            <div className="text-[var(--muted)]">LangGraph</div>
            <div className="text-[var(--info)]">run_51c4a2...</div>
            <div className="text-right tabular-nums">$0.0480</div>
          </div>
          <div className="grid grid-cols-6 py-2 px-3 text-[var(--text)]">
            <div className="font-semibold">doc-retriever</div>
            <div className="flex items-center gap-1.5 text-[var(--muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
              COMPLETED
            </div>
            <div>ACTIVE</div>
            <div className="text-[var(--muted)]">custom Python</div>
            <div className="text-[var(--info)]">run_3b119d...</div>
            <div className="text-right tabular-nums">$0.0120</div>
          </div>
        </div>
      )}

      {heroTab === "incident" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--critical-surface)] text-[var(--critical)] border border-[var(--critical-border)] text-[10px] font-mono font-bold">
                  CRITICAL
                </span>
                <h3 className="font-bold text-[var(--text)] text-[16px]">STUCK_LOOP</h3>
                <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--warning-surface)] text-[var(--warning)] border border-[var(--warning-border)] text-[10px] font-mono font-semibold">
                  OPEN
                </span>
              </div>
              <div className="text-[12px] text-[var(--muted)] font-mono">
                Agent: support-router • Run: run_a8f93e11 • 2m ago
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-[12px] font-mono">
              <div>
                <span className="text-[var(--muted)]">Repeated Tool:</span>{" "}
                <span className="font-bold text-[var(--text)]">query_customer_crm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--muted)]">Repetitions:</span>
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--critical)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--critical)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--critical)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--critical)]" />
                </div>
                <span className="font-bold text-[var(--text)] ml-1">(4 / 4)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="p-2 rounded bg-[var(--surface-1)] border border-[var(--border)]">
                <span className="text-[var(--muted)] block text-[10px]">ARGS HASH (SHA-256)</span>
                <span className="text-[var(--text)]">8a3f9104c2...</span>
              </div>
              <div className="p-2 rounded bg-[var(--surface-1)] border border-[var(--border)]">
                <span className="text-[var(--muted)] block text-[10px]">RESPONSE HASH</span>
                <span className="text-[var(--text)]">e710d8bb30...</span>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-2 text-right">
              <span className="font-mono text-[11px] text-[var(--muted)]">
                Decided by a deterministic rule. No LLM involved.
              </span>
            </div>
          </div>
        </div>
      )}

      {heroTab === "approve" && (
        <div className="space-y-4 max-w-lg mx-auto">
          <div className="p-4 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] font-semibold text-[var(--text)] uppercase tracking-wider">
                Proposed Recovery Plan
              </span>
              <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--ok-surface)] text-[var(--ok)] border border-[var(--ok-border)] text-[10px] font-mono">
                Risk: LOW
              </span>
            </div>

            <div className="space-y-1 text-[12px] font-mono">
              <div>
                <span className="text-[var(--muted)]">Action:</span>{" "}
                <strong className="text-[var(--text)]">RESUME</strong>
              </div>
              <div>
                <span className="text-[var(--muted)]">Historical Trust:</span>{" "}
                <span className="text-[var(--text)]">Worked 8 of 10 times for this pattern</span>
              </div>
              <div className="text-[11px] text-[var(--muted)] pt-1">
                Consequence: The safety gate will release execution. Upstream state will resume at the next workflow node.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                className="px-3 py-1.5 rounded-[var(--radius-control)] bg-[var(--text)] text-[var(--bg)] font-medium text-[12px]"
              >
                Approve and Resume
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-[var(--radius-control)] bg-transparent hover:bg-[var(--surface-3)] text-[var(--muted)] font-medium text-[12px]"
              >
                Reject
              </button>
            </div>
          </div>

          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[11px] text-[var(--muted)]">
            <span>Audit log attribution: </span>
            <strong className="text-[var(--text)]">admin@agentfuse.com</strong>
            <span> verified plan at 2026-11-22T20:15:00Z</span>
          </div>
        </div>
      )}
    </div>
  );
}
