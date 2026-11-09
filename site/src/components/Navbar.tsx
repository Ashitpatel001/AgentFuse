import { Link, NavLink } from "react-router-dom";
import { Activity, ArrowRight, Code2, Sparkles, UserPlus } from "lucide-react";

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";

interface NavbarProps {
  onOpenSignUp?: () => void;
}

export function Navbar({ onOpenSignUp }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-sm shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-[15px] font-bold text-slate-900 tracking-tight">
              CortexHeal
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-slate-500">
            <a
              href="#monitoring"
              className="transition-colors hover:text-slate-900 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              Watchdog
            </a>
            <a
              href="#pricing"
              className="transition-colors hover:text-slate-900"
            >
              Pricing
            </a>
            <NavLink
              to="/docs"
              className={({ isActive }) =>
                `transition-colors hover:text-slate-900 ${isActive ? "text-slate-900" : ""}`
              }
            >
              Docs
            </NavLink>
            <NavLink
              to="/blog"
              className={({ isActive }) =>
                `transition-colors hover:text-slate-900 ${isActive ? "text-slate-900" : ""}`
              }
            >
              Blog
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <a
            href="https://github.com/Ashitpatel001/Cortexheal"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
            title="GitHub Repository"
          >
            <Code2 className="w-4 h-4" />
          </a>

          {/* Sign Up Button for new users */}
          <button
            onClick={onOpenSignUp}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 text-[13px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Up</span>
          </button>

          {/* Launch Dashboard CTA */}
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 hover:shadow-blue-600/30 transition-all"
          >
            Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
