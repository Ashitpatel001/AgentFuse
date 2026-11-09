import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, ShieldAlert, LogOut, Download, Server, KeyRound, Users, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSSE } from "../sse";
import { useAuth } from "./AuthGate";
import { ExportAuditModal } from "./ExportAuditModal";
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
}: {
  to: string;
  icon: typeof Activity;
  label: string;
  hint?: string;
  end?: boolean;
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
          {hint && (
            <span className="text-[10px] font-mono text-text-muted/50 group-hover:text-text-muted transition-colors">
              {hint}
            </span>
          )}
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

  return (
    <div className="flex h-screen bg-bg-base text-text-secondary font-sans">
      <aside className="w-[220px] flex flex-col border-r border-border-subtle">
        {/* Logo */}
        <div className="h-14 px-4 flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[15px] font-bold text-text-primary tracking-tight">
            CortexHeal
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} end={item.to === "/"} />
          ))}

          {user?.role === "ADMIN" && (
            <>
              <div className="pt-4 pb-1.5 px-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Admin
                </span>
              </div>
              {adminItems.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </>
          )}

          <button
            onClick={() => setIsExportOpen(true)}
            className="group flex items-center gap-2.5 px-3 py-[7px] w-full rounded-lg text-[13px] font-medium text-text-tertiary hover:text-text-secondary hover:bg-white/[0.03] transition-colors text-left mt-0.5"
          >
            <Download className="w-[15px] h-[15px]" />
            <span className="flex-1">Export Audit Log</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border-subtle space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Stream</span>
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
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-lg bg-bg-overlay flex items-center justify-center text-[11px] font-semibold text-text-tertiary uppercase flex-shrink-0">
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

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <ExportAuditModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
