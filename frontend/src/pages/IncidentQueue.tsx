import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { IncidentRow } from "../components/IncidentRow";
import { LoadingState, ErrorState, EmptyState } from "../components/ui";
import { MetricsBar } from "../components/MetricsBar";
import { ShieldCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";

export function IncidentQueue() {
  const [skip, setSkip] = useState(0);
  const limit = 50;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");

  const { data, isLoading, error } = useQuery({
    queryKey: ["incidents", skip, limit],
    queryFn: () => api.getIncidents(skip, limit),
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  });

  const incidents = data?.data || [];
  const total = data?.total || 0;

  // Client-side filtering & sorting
  const filtered = useMemo(() => {
    return incidents.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRun = item.run_id?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesType = item.failure_type?.toLowerCase().includes(q);
        const matchesId = item.incident_id?.toLowerCase().includes(q);
        if (!matchesRun && !matchesDesc && !matchesType && !matchesId) return false;
      }

      // Severity filter
      if (severityFilter !== "ALL" && item.severity !== severityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.status === "OPEN" && b.status !== "OPEN") return -1;
      if (a.status !== "OPEN" && b.status === "OPEN") return 1;
      return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime();
    });
  }, [incidents, searchQuery, severityFilter, statusFilter]);

  if (isLoading) return <LoadingState message="Loading incident telemetry..." />;
  if (error) return <ErrorState title="Failed to load incidents" error={error} />;

  const criticalCount = incidents.filter((i) => i.severity === "CRITICAL").length;
  const highCount = incidents.filter((i) => i.severity === "HIGH").length;
  const openCount = incidents.filter((i) => i.status === "OPEN").length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <MetricsBar />

      {/* Datadog Watchdog Style Filter & Triage Header */}
      <div className="bg-bg-raised border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">Watchdog Incident Queue</h1>
              {openCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-mono font-bold animate-pulse">
                  {openCount} ACTION REQUIRED
                </span>
              )}
            </div>
            <p className="text-[12px] text-text-muted mt-0.5">
              Deterministic circuit breaker trips, loop interventions, and operator approvals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-muted font-mono tabular-nums">
              Showing {filtered.length} of {total} incidents
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

        {/* Search & Filter Toolbar */}
        <div className="pt-2 border-t border-border-subtle/50 flex flex-wrap items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search agent id, tool, or run ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-base border border-border-subtle rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity selector */}
            <div className="flex items-center p-0.5 bg-bg-base border border-border-subtle rounded-lg text-xs font-mono">
              <button
                onClick={() => setSeverityFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  severityFilter === "ALL" ? "bg-bg-elevated text-text-primary font-bold shadow-sm" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setSeverityFilter("CRITICAL")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  severityFilter === "CRITICAL" ? "bg-red-500/20 text-red-400 font-bold shadow-sm" : "text-text-muted hover:text-red-400"
                }`}
              >
                CRITICAL ({criticalCount})
              </button>
              <button
                onClick={() => setSeverityFilter("HIGH")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  severityFilter === "HIGH" ? "bg-amber-500/20 text-amber-400 font-bold shadow-sm" : "text-text-muted hover:text-amber-400"
                }`}
              >
                HIGH ({highCount})
              </button>
            </div>

            {/* Status toggle */}
            <div className="flex items-center p-0.5 bg-bg-base border border-border-subtle rounded-lg text-xs font-mono">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === "ALL" ? "bg-bg-elevated text-text-primary font-bold" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                STATUS: ALL
              </button>
              <button
                onClick={() => setStatusFilter("OPEN")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === "OPEN" ? "bg-amber-500/20 text-amber-400 font-bold" : "text-text-muted hover:text-amber-400"
                }`}
              >
                OPEN ONLY
              </button>
              <button
                onClick={() => setStatusFilter("RESOLVED")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === "RESOLVED" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-text-muted hover:text-emerald-400"
                }`}
              >
                RESOLVED
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Incident List */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No matching incidents"
          description={searchQuery || severityFilter !== "ALL" || statusFilter !== "ALL" ? "No incidents match your active filters. Try clearing your search." : "All systems are nominal. Agents are running within safety bounds."}
          icon={ShieldCheck}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((incident, i) => (
            <div key={incident.incident_id} style={{ animationDelay: `${i * 30}ms` }} className="animate-fade-in">
              <IncidentRow incident={incident} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
