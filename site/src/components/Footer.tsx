import { Link } from "react-router-dom";
import { Zap, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface-1)] py-12 text-[12px] text-[var(--muted)] font-mono">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center text-white">
                <Zap className="w-3 h-3 fill-current" />
              </div>
              <span className="font-bold text-[var(--text)] text-[14px]">AgentFuse</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Real-time circuit breaker for autonomous AI agents. Deterministic loop detection with zero LLMs in the decision path.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-[var(--text)] font-semibold mb-2.5">
              Resources
            </h4>
            <ul className="space-y-1.5 text-[12px]">
              <li>
                <Link to="/docs" className="hover:text-[var(--text)] transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <a href="/openapi.json" className="hover:text-[var(--text)] transition-colors">
                  OpenAPI Specification
                </a>
              </li>
              <li>
                <a href="/llms.txt" className="hover:text-[var(--text)] transition-colors">
                  /llms.txt
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-[var(--text)] font-semibold mb-2.5">
              Community
            </h4>
            <ul className="space-y-1.5 text-[12px]">
              <li>
                <a
                  href="https://github.com/Ashitpatel001/AgentFuse"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--text)] transition-colors inline-flex items-center gap-1"
                >
                  GitHub Repository <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Ashitpatel001/AgentFuse/discussions"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--text)] transition-colors inline-flex items-center gap-1"
                >
                  Discussions <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                </a>
              </li>
              <li>
                <a
                  href="mailto:access@agentfuse.com?subject=Hosted%20Access%20Request"
                  className="hover:text-[var(--text)] transition-colors"
                >
                  Request hosted access
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-wider text-[var(--text)] font-semibold mb-2.5">
              Project
            </h4>
            <ul className="space-y-1.5 text-[12px]">
              <li>
                <a
                  href="https://github.com/Ashitpatel001/AgentFuse/blob/main/LICENSE"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--text)] transition-colors"
                >
                  License (Apache-2.0)
                </a>
              </li>
              <li>
                <Link to="/docs#security" className="hover:text-[var(--text)] transition-colors">
                  Security policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[var(--muted)]">
          <p>Apache-2.0 open-source software. No telemetry collected without consent.</p>
          <p>v0.1.0-alpha</p>
        </div>
      </div>
    </footer>
  );
}
