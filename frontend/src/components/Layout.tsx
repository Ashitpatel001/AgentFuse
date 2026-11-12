import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, ShieldAlert, LogOut, Download, Server, KeyRound, Users, Layers, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSSE } from "../sse";
import { useAuth } from "./AuthGate";
import { ExportAuditModal } from "./ExportAuditModal";
import { api } from "../api";
import { cn } from "../utils";

const navItems = [
  { to: "/", icon: ShieldAlert, label: "Incidents", hint: "I" },
  { to: "/queues", icon: Layers, label: "Agent Queues", hint: "Q" },
  { to: "/runs", icon: Activity, label: "Executions", hint: "E" },
  { to: "/fleet", icon: Server, label: "Fleet Status", hint: "F" },
];

const adminItems = [
  { to: "/team", icon: Users, label: "Team" },
  { to: "/keys", icon: KeyRound, label: "API Keys" },
];

function NavItem({
  to,
  icon: Icon,
  label,
  hint,
  end,
  badge,
}: {
  to: string;
  icon: typeof Activity;
  label: string;
  hint?: string;
  end?: boolean;
  badge?: number | null;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-colors",
          isActive
            ? "bg-white/[0.06] text-text-primary"
            : "text-text-tertiary hover:text-text-secondary hover:bg-white/[0.03]"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-accent rounded-r-full" />
          )}
          <Icon className={cn("w-[15px] h-[15px]", isActive && "text-accent")} />
          <span className="flex-1">{label}</span>
          {badge != null && badge > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold">
              {badge}
            </span>
          ) : hint ? (
            <span className="text-[10px] font-mono text-text-muted/50 group-hover:text-text-muted transition-colors">
              {hint}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export function Layout() {
  useSSE();
  const { user, logout } = useAuth();
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  const { data: sseStatus = "disconnected" } = useQuery<string>({
    queryKey: ["sse_status"],
    queryFn: () => "disconnected",
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: incidentsData } = useQuery({
    queryKey: ["incidents_badge"],
    queryFn: () => api.getIncidents(0, 50),
    refetchInterval: 5000,
  });

  const openCount = incidentsData?.data?.filter((i) => i.status === "OPEN").length || 0;

  return (
    <div className="flex h-screen bg-bg-base text-text-secondary font-sans overflow-hidden">
      <aside className="w-[220px] flex flex-col border-r border-border-subtle bg-bg-raised/40">
        {/* Logo */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-border-subtle/40">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-text-primary tracking-tight">
              CortexHeal
            </span>
            <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-bg-overlay border border-border-subtle text-accent">
              CONSOLE
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-2.5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem 
              key={item.to} 
              {...item} 
              end={item.to === "/"} 
              badge={item.to === "/" ? openCount : undefined} 
            />
          ))}

          {user?.role === "ADMIN" && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Admin & Tenancy
                </span>
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </>
          )}

          <div className="pt-3">
            <button
              onClick={() => setIsExportOpen(true)}
              className="group flex items-center gap-2.5 px-3 py-[7px] w-full rounded-lg text-[13px] font-medium text-text-tertiary hover:text-text-secondary hover:bg-white/[0.03] transition-colors text-left"
            >
              <Download className="w-[15px] h-[15px]" />
              <span className="flex-1">SOC2 Audit Export</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border-subtle space-y-2.5 bg-bg-raised/60">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Event Bus</span>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  sseStatus === "connected"
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                    : sseStatus === "reconnecting"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-red-400/60"
                )}
              />
              <span className="text-[10px] font-mono text-text-muted">
                {sseStatus}
              </span>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-2.5 px-1 pt-1 border-t border-border-subtle/50">
              <div className="w-7 h-7 rounded-lg bg-bg-overlay flex items-center justify-center text-[11px] font-semibold text-text-tertiary uppercase flex-shrink-0 border border-border-subtle">
                {user.email[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-text-secondary font-medium truncate" title={user.email}>
                  {user.email}
                </div>
                <div className="text-[10px] font-mono text-text-muted">
                  {user.role}{user.auth === "api_key" ? " · key" : ""}
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Enterprise Global Header (Datadog / Linear style) */}
        <header className="h-14 border-b border-border-subtle bg-bg-raised/70 backdrop-blur px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-bg-overlay border border-border-subtle text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-text-primary font-semibold">default_org</span>
              <span className="text-text-muted">/</span>
              <span className="text-text-secondary">fleet-prod</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-text-muted">
              <span>Circuit Breaker: <strong className="text-emerald-400 font-semibold">ARMED (24ms)</strong></span>
              <span>•</span>
              <span>Proxy Gateway: <strong className="text-blue-400 font-semibold">POST /v1</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {openCount > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-mono font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {openCount} ACTION REQUIRED
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ALL AGENTS NOMINAL
              </div>
            )}

            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-text-muted hover:text-text-secondary bg-bg-overlay border border-border-subtle transition-colors"
            >
              Public Site
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <ExportAuditModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
