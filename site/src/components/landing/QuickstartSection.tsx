import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function QuickstartSection() {
  const [copiedQuickstart, setCopiedQuickstart] = useState(false);

  const handleCopyQuickstart = () => {
    const cmd = `git clone https://github.com/Ashitpatel001/AgentFuse.git
cd AgentFuse
docker compose up -d
python scripts/reseed_demo_data.py --confirm-destroy`;

    navigator.clipboard.writeText(cmd);
    setCopiedQuickstart(true);
    setTimeout(() => setCopiedQuickstart(false), 2000);
  };

  return (
    <section id="quickstart" className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
      <div className="max-w-3xl space-y-3 mb-6">
        <span className="font-mono text-[12px] font-bold text-[var(--brand)] uppercase tracking-wider block">
          05
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          Self-host in minutes
        </h2>
        <p className="text-[14px] text-[var(--muted)] leading-relaxed">
          Run on your own infrastructure under the Apache-2.0 license. Requires PostgreSQL and
          an optional Redis instance. Zero external telemetry calls.
        </p>
      </div>

      <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] p-4 max-w-2xl font-mono text-[12px] space-y-3">
        <div className="flex items-center justify-between text-[var(--muted)] border-b border-[var(--border)] pb-2 text-[11px]">
          <span>Terminal (bash / powershell)</span>
          <button
            type="button"
            onClick={handleCopyQuickstart}
            className="inline-flex items-center gap-1 text-[var(--text)] hover:text-[var(--brand)] transition-colors"
          >
            {copiedQuickstart ? <Check className="w-3 h-3 text-[var(--ok)]" /> : <Copy className="w-3 h-3" />}
            <span>{copiedQuickstart ? "Copied" : "Copy commands"}</span>
          </button>
        </div>

        <pre className="text-[var(--text)] overflow-x-auto space-y-1">
          <code>git clone https://github.com/Ashitpatel001/AgentFuse.git</code>{"\n"}
          <code>cd AgentFuse</code>{"\n"}
          <code>docker compose up -d</code>{"\n"}
          <code>python scripts/reseed_demo_data.py --confirm-destroy</code>
        </pre>
      </div>
    </section>
  );
}
