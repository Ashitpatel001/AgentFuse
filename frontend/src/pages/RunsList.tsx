import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Badge, LoadingState, ErrorState, EmptyState } from "../components/ui";
import { relativeTime } from "../utils";
import { ListTree, ChevronLeft, ChevronRight } from "lucide-react";

function RunStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "amber" | "green" | "accent" | "neutral" | "red"; label: string }> = {
    paused: { variant: "amber", label: "PAUSED" },
    running: { variant: "green", label: "RUNNING" },
    pause_requested: { variant: "amber", label: "PAUSING" },
    resume_requested: { variant: "accent", label: "RESUMING" },
    completed: { variant: "neutral", label: "COMPLETED" },
    failed: { variant: "red", label: "FAILED" },
  };
  const entry = map[status] || { variant: "neutral" as const, label: status };
  return <Badge variant={entry.variant} dot>{entry.label}</Badge>;
}

export function RunsList() {
  const [skip, setSkip] = useState(0);
  const limit = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ["runs", skip, limit],
    queryFn: () => api.getRuns(skip, limit),
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <LoadingState message="Loading runs..." />;
  if (error) return <ErrorState title="Failed to load runs" error={error} />;

  const runs = data?.data || [];
  const total = data?.total || 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Agent Executions</h1>
          <p className="text-[12px] text-text-muted mt-0.5">All tracked agent runs and their outcomes</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted font-mono tabular-nums">
            {total > 0 ? `${skip + 1}–${Math.min(skip + limit, total)}` : "0"} of {total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - limit))}
              className="p-1.5 rounded-lg border border-border-subtle text-text-muted hover:text-text-secondary hover:bg-bg-elevated hover:border-border-default disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={skip + limit >= total}
              onClick={() => setSkip(skip + limit)}
              className="p-1.5 rounded-lg border border-border-subtle text-text-muted hover:text-text-secondary hover:bg-bg-elevated hover:border-border-default disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {runs.length === 0 ? (
        <EmptyState
          title="No agent runs"
          description="No agents have been tracked by the control plane yet."
          icon={ListTree}
        />
      ) : (
        <div className="bg-bg-raised border border-border-subtle rounded-xl overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">
                  Run ID
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">
                  Agent
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">
                  Framework
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40">
                  Status
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted bg-bg-base/40 text-right">
                  Started
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {runs.map((run) => (
                <tr key={run.run_id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono">
                    <Link to={`/runs/${run.run_id}`} className="text-accent hover:text-accent-hover transition-colors font-medium">
                      {run.run_id.substring(0, 16)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{run.agent_id}</td>
                  <td className="px-4 py-3 text-text-tertiary capitalize">{run.framework}</td>
                  <td className="px-4 py-3">
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted font-mono text-[11px]" title={run.start_time}>
                    {relativeTime(run.start_time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
