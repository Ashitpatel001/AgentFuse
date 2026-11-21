import { Activity, Shield, Code2, ArrowUpRight, Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-14 text-slate-600 text-xs">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center text-slate-950 font-bold">
                <Zap className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="text-[16px] font-extrabold text-slate-900 tracking-tight">Agent<span className="text-amber-500">Fuse</span></span>
            </div>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              The Reliability & Safety Platform for Autonomous AI Agents. Stops runaway tool loops and enforces real-time budget firewalls.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-700 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Fuse Armed • v0.1.0 Production
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-900 font-bold mb-3">Product</h4>
            <ul className="space-y-2">
              <li><a href="#breaker" className="hover:text-indigo-600 transition-colors">Circuit Breaker Simulator</a></li>
              <li><a href="#watchdog" className="hover:text-indigo-600 transition-colors">Watchdog Agent Queues</a></li>
              <li><a href="#architecture" className="hover:text-indigo-600 transition-colors">Architecture & Latency</a></li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-900 font-bold mb-3">Developers</h4>
            <ul className="space-y-2">
              <li><a href="/docs" className="hover:text-indigo-600 transition-colors">API Reference & SDK</a></li>
              <li><a href="/docs" className="hover:text-indigo-600 transition-colors">LangGraph Adapter</a></li>
              <li><a href="/docs" className="hover:text-indigo-600 transition-colors">OpenAI Gateway Drop-in</a></li>
              <li><a href="https://github.com/Ashitpatel001/AgentFuse" target="_blank" rel="noreferrer" className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1">GitHub Repository <ArrowUpRight className="w-3 h-3" /></a></li>
            </ul>
          </div>

          {/* Enterprise */}
          <div>
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-900 font-bold mb-3">Enterprise</h4>
            <ul className="space-y-2">
              <li><span className="text-slate-500">Bare-Metal Linux Deployment</span></li>
              <li><span className="text-slate-500">Air-Gapped VPC Architecture</span></li>
              <li><span className="text-slate-500">SOC2 Audit Export</span></li>
              <li><span className="text-slate-500">Deterministic Hashing Specs</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <p>© {new Date().getFullYear()} AgentFuse, Inc. All rights reserved.</p>
          <p className="font-mono">Engineered for mission-critical autonomous workloads.</p>
        </div>
      </div>
    </footer>
  );
}
