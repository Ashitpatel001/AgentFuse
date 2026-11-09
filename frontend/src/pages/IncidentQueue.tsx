import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { IncidentRow } from "../components/IncidentRow";
import { LoadingState, ErrorState, EmptyState } from "../components/ui";
import { MetricsBar } from "../components/MetricsBar";
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

export function IncidentQueue() {
  const [skip, setSkip] = useState(0);
  const limit = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ["incidents", skip, limit],
    queryFn: () => api.getIncidents(skip, limit),
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <LoadingState message="Loading incidents..." />;
  if (error) return <ErrorState title="Failed to load incidents" error={error} />;

  const incidents = data?.data || [];
  const total = data?.total || 0;

  const sorted = [...incidents].sort((a, b) => {
    if (a.status === "OPEN" && b.status !== "OPEN") return -1;
    if (a.status !== "OPEN" && b.status === "OPEN") return 1;
    return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime();
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <MetricsBar />

      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Incident Queue</h1>
          <p className="text-[12px] text-text-muted mt-0.5">Active and recent safety incidents</p>
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

      {sorted.length === 0 ? (
        <EmptyState
          title="No active incidents"
          description="All systems are nominal. Agents are running within safety bounds."
          icon={ShieldCheck}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((incident, i) => (
            <div key={incident.incident_id} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-in">
              <IncidentRow incident={incident} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
