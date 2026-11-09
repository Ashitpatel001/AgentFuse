import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Link } from "react-router-dom";
import { Activity, Play, Pause, CheckCircle, AlertTriangle } from "lucide-react";
import { LoadingState, ErrorState, EmptyState, Badge } from "../components/ui";
import { cn } from "../utils";
import { Server } from "lucide-react";
import { useMemo } from "react";

function StatusIndicator({ status }: { status: string }) {
  const config: Record<string, { variant: "green" | "amber" | "neutral" | "red"; Icon: typeof Activity; label: string }> = {
    running: { variant: "green", Icon: Play, label: "RUNNING" },
    resuming: { variant: "green", Icon: Play, label: "RESUMING" },
    resume_requested: { variant: "green", Icon: Play, label: "RESUMING" },
    paused: { variant: "amber", Icon: Pause, label: "PAUSED" },
    pause_requested: { variant: "amber", Icon: Pause, label: "PAUSING" },
    completed: { variant: "neutral", Icon: CheckCircle, label: "COMPLETED" },
    failed: { variant: "red", Icon: AlertTriangle, label: "FAILED" },
  };
  const { variant, label } = config[status.toLowerCase()] || { variant: "neutral" as const, Icon: Activity, label: status };
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}

export function FleetView() {
  const { data: fleet, isLoading, error } = useQuery({
    queryKey: ["fleet"],
    queryFn: () => api.getFleet(),
  });

  const activityBars = useMemo(() => {
    if (!fleet) return {};
    const bars: Record<string, number[]> = {};
    for (const agent of fleet) {
      bars[agent.agent_id] = Array.from({ length: 16 }, () => {
        const isActive = ["running", "resuming", "pause_requested", "resume_requested"].includes(agent.status);
        return agent.event_count > 0 ? Math.max(15, Math.min(100, Math.random() * 100)) : isActive ? 25 : 8;
      });
    }
    return bars;
  }, [fleet]);

  if (isLoading) return <LoadingState message="Loading fleet data..." />;
  if (error) return <ErrorState title="Failed to load fleet data" error={error} />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Fleet Status</h1>
          <p className="text-[12px] text-text-muted mt-0.5">Tracked agents and their current state</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-raised border border-border-subtle rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.5)] animate-pulse" />
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Live</span>
        </div>
      </div>

      {(!fleet || fleet.length === 0) ? (
        <EmptyState
          title="No active agents"
          description="No agents have been tracked by the control plane yet."
          icon={Server}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fleet.map((agent, i) => {
            const isActive = ["running", "resuming", "pause_requested", "resume_requested"].includes(agent.status);
            const isPaused = agent.status === "paused" || agent.status === "pause_requested";
            return (
              <Link
                key={agent.agent_id}
                to={`/runs/${agent.run_id}`}
                className={cn(
                  "group bg-bg-raised border rounded-xl p-4 transition-all duration-200",
                  isPaused
                    ? "border-amber-500/20 hover:border-amber-500/30"
                    : "border-border-subtle hover:border-border-default"
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-mono text-[13px] text-text-secondary group-hover:text-text-primary transition-colors truncate pr-3 font-medium">
                    {agent.agent_id}
                  </h3>
                  <StatusIndicator status={agent.status} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Run</span>
                    <span className="font-mono text-text-tertiary">{agent.run_id.split("-")[0]}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Events</span>
                    <span className="font-mono text-text-tertiary bg-bg-overlay px-1.5 py-0.5 rounded">
                      {agent.event_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Last Active</span>
                    <span className="text-text-tertiary">
                      {new Date(agent.end_time || agent.start_time).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Activity sparkline */}
                <div className="mt-3.5 pt-3 border-t border-border-subtle flex items-end gap-[2px] h-5">
                  {(activityBars[agent.agent_id] || []).map((height, j) => (
                    <div
                      key={j}
                      className={cn(
                        "flex-1 rounded-sm transition-all duration-500",
                        isActive ? "bg-accent" : isPaused ? "bg-amber-500" : "bg-border-default"
                      )}
                      style={{ height: `${height}%`, opacity: isActive ? 0.7 : isPaused ? 0.3 : 0.2 }}
                    />
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
