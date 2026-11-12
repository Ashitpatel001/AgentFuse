import { Link, NavLink } from "react-router-dom";
import { Activity, ArrowRight, Code2, Sparkles, UserPlus, Shield, Terminal } from "lucide-react";

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";

interface NavbarProps {
  onOpenSignUp?: () => void;
}

export function Navbar({ onOpenSignUp }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-white tracking-tight">
                CortexHeal
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                v1.0
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-zinc-400">
            <a
              href="#simulator"
              className="transition-colors hover:text-white flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Live Breaker
            </a>
            <a
              href="#monitoring"
              className="transition-colors hover:text-white flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Watchdog
            </a>
            <a
              href="#architecture"
              className="transition-colors hover:text-white"
            >
              Architecture
            </a>
            <a
              href="#pricing"
              className="transition-colors hover:text-white"
            >
              Pricing
            </a>
            <NavLink
              to="/docs"
              className={({ isActive }) =>
                `transition-colors hover:text-white ${isActive ? "text-white" : ""}`
              }
            >
              Docs
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <a
            href="https://github.com/Ashitpatel001/Cortexheal"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-850"
            title="GitHub Repository"
          >
            <Code2 className="w-4 h-4" />
          </a>

          {/* Sign Up Button for new users */}
          <button
            onClick={onOpenSignUp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[12px] sm:text-[13px] font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 rounded-lg transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-400" />
            <span>Sign Up</span>
          </button>

          {/* Launch Dashboard CTA */}
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-600/30 transition-all"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Console</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-200" />
          </a>
        </div>
      </div>
    </header>
  );
}
