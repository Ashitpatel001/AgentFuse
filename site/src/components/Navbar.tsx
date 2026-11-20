import { Link, NavLink } from "react-router-dom";
import { Activity, ArrowRight, Code2, Sparkles, Shield, Terminal, Zap } from "lucide-react";

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";

interface NavbarProps {
  onOpenSignUp?: () => void;
}

export function Navbar({ onOpenSignUp }: NavbarProps = {}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 shadow-sm shadow-amber-500/25 group-hover:bg-amber-400 transition-all">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-extrabold text-slate-900 tracking-tight font-sans">
                Agent<span className="text-amber-500">Fuse</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                24ms Breaker
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-slate-600">
            <a
              href="#breaker"
              className="transition-colors hover:text-indigo-600 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              Circuit Breaker
            </a>
            <a
              href="#watchdog"
              className="transition-colors hover:text-indigo-600 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Watchdog AI
            </a>
            <a
              href="#frameworks"
              className="transition-colors hover:text-indigo-600"
            >
              Integrations
            </a>
            <a
              href="#calculator"
              className="transition-colors hover:text-indigo-600"
            >
              ROI Estimator
            </a>
            <NavLink
              to="/docs"
              className={({ isActive }) =>
                `transition-colors hover:text-indigo-600 ${isActive ? "text-indigo-600 font-semibold" : ""}`
              }
            >
              Docs
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Ashitpatel001/AgentFuse"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-all"
            title="GitHub Repository"
          >
            <Code2 className="w-4 h-4 text-slate-600" />
            <span>GitHub</span>
          </a>

          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/25 transition-all"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Launch Console</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-200" />
          </a>
        </div>
      </div>
    </header>
  );
}
