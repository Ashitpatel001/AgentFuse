import { Link } from "react-router-dom";
import { Activity } from "lucide-react";

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="text-[14px] font-bold text-slate-900 tracking-tight">CortexHeal</span>
            </div>
            <p className="text-[12px] text-slate-500 leading-relaxed max-w-xs">
              Deterministic safety and circuit-breaker control plane for AI agent fleets.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5 text-[13px] text-slate-600">
              <li><Link to="/docs" className="hover:text-slate-900 transition-colors">Documentation</Link></li>
              <li><a href={DASHBOARD_URL} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">Dashboard</a></li>
              <li><Link to="/docs#adapters" className="hover:text-slate-900 transition-colors">Adapters</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2.5 text-[13px] text-slate-600">
              <li><Link to="/blog" className="hover:text-slate-900 transition-colors">Blog</Link></li>
              <li><a href="https://github.com/Ashitpatel001/CortexHeal" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">GitHub</a></li>
              <li><a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors">API Reference</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Security</h4>
            <ul className="space-y-2.5 text-[13px] text-slate-600">
              <li>Zero-LLM decision path</li>
              <li>Immutable audit trail</li>
              <li>Tenant-isolated orgs</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400">
          <p>&copy; {new Date().getFullYear()} CortexHeal</p>
          <p className="font-mono tracking-wide">Deterministic AI Safety</p>
        </div>
      </div>
    </footer>
  );
}
