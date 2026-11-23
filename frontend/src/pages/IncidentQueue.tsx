import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { LoadingState, ErrorState, EmptyState, Badge, StatusDot, Kbd } from "../components/ui";
import { IncidentDetailPane } from "../components/IncidentDetailPane";
import { ShortcutsDialog } from "../components/ShortcutsDialog";
import { relativeTime, cn } from "../utils";
import { Search, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { useRole } from "../hooks/useRole";

export function IncidentQueue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: paramId } = useParams<{ id?: string }>();
  const urlSelectedId = paramId || searchParams.get("id");

  const [skip, setSkip] = useState(0);
  const limit = 50;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "MEDIUM">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");

  // Dialog states for keyboard actions
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const { role, isOperator } = useRole();
  const isRoleResolved = role !== "UNKNOWN";
  const canAct = isRoleResolved && isOperator;

  // Telemetry query
  const { data, isLoading, error } = useQuery({
    queryKey: ["incidents", skip, limit],
    queryFn: () => api.getIncidents(skip, limit),
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  });

  const incidents = data?.data || [];
  const total = data?.total || 0;

  // Filtering & Sorting
  const filtered = useMemo(() => {
    return incidents
      .filter((item) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesRun = item.run_id?.toLowerCase().includes(q);
          const matchesDesc = item.description?.toLowerCase().includes(q);
          const matchesType = item.failure_type?.toLowerCase().includes(q);
          const matchesAgent = item.agent_id?.toLowerCase().includes(q);
          const matchesId = item.incident_id?.toLowerCase().includes(q);
          if (!matchesRun && !matchesDesc && !matchesType && !matchesAgent && !matchesId) return false;
        }

        if (severityFilter !== "ALL" && item.severity !== severityFilter) {
          return false;
        }

        if (statusFilter !== "ALL" && item.status !== statusFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.status === "OPEN" && b.status !== "OPEN") return -1;
        if (a.status !== "OPEN" && b.status === "OPEN") return 1;
        return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime();
      });
  }, [incidents, searchQuery, severityFilter, statusFilter]);

  // Selected incident resolution
  const selectedIndex = useMemo(() => {
    if (!filtered.length) return -1;
    if (!urlSelectedId) return 0;
    const foundIdx = filtered.findIndex((i) => i.incident_id === urlSelectedId);
    return foundIdx !== -1 ? foundIdx : 0;
  }, [filtered, urlSelectedId]);

  const selectedIncident = useMemo(() => {
    if (selectedIndex >= 0 && selectedIndex < filtered.length) {
      return filtered[selectedIndex];
    }
    return null;
  }, [filtered, selectedIndex]);

  // Sync URL when selection defaults
  useEffect(() => {
    if (selectedIncident && !urlSelectedId) {
      setSearchParams({ id: selectedIncident.incident_id }, { replace: true });
    }
  }, [selectedIncident, urlSelectedId, setSearchParams]);

  const selectIncidentByIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < filtered.length) {
        const item = filtered[index];
        setSearchParams({ id: item.incident_id }, { replace: true });
      }
    },
    [filtered, setSearchParams]
  );

  // Keyboard Navigation: j/k, a, x, c, ?
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in form controls or contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target && (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
        )
      ) {
        return;
      }

      // If any dialog is open anywhere, ignore shortcuts
      if (
        isApproveOpen ||
        isRejectOpen ||
        isShortcutsOpen ||
        Boolean(document.querySelector('[role="dialog"], [data-radix-dialog-content], dialog[open]'))
      ) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = Math.min(filtered.length - 1, selectedIndex + 1);
        selectIncidentByIndex(nextIndex);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = Math.max(0, selectedIndex - 1);
        selectIncidentByIndex(prevIndex);
      } else if (e.key === "a") {
        e.preventDefault();
        if (selectedIncident && canAct && selectedIncident.status !== "RESOLVED") {
          setIsApproveOpen(true);
        }
      } else if (e.key === "x") {
        e.preventDefault();
        if (selectedIncident && canAct && selectedIncident.status !== "RESOLVED") {
          setIsRejectOpen(true);
        }
      } else if (e.key === "c") {
        e.preventDefault();
        if (selectedIncident) {
          const contextPayload = `AgentFuse Incident: ${selectedIncident.incident_id}\nRun: ${selectedIncident.run_id}\nAgent: ${selectedIncident.agent_id}\nType: ${selectedIncident.failure_type}\nSeverity: ${selectedIncident.severity}\nStatus: ${selectedIncident.status}\nObserved: ${selectedIncident.observed_value}\nThreshold: ${selectedIncident.threshold}\nNote: Decided by a deterministic rule. No LLM involved.`;
          navigator.clipboard.writeText(contextPayload);
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    filtered.length,
    selectedIndex,
    selectIncidentByIndex,
    selectedIncident,
    canAct,
    isApproveOpen,
    isRejectOpen,
    isShortcutsOpen,
  ]);

  if (isLoading && !data) return <LoadingState message="Loading incident telemetry..." />;
  if (error) return <ErrorState title="Failed to load incidents" error={error} />;

  const criticalCount = incidents.filter((i) => i.severity === "CRITICAL").length;
  const highCount = incidents.filter((i) => i.severity === "HIGH").length;
  const openCount = incidents.filter((i) => i.status === "OPEN").length;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-[var(--bg)]">
      {/* LEFT: Compact Master List */}
      <aside className="w-80 md:w-96 shrink-0 border-r border-[var(--border)] bg-[var(--surface-1)] flex flex-col h-full">
        {/* Header & Controls */}
        <div className="p-3.5 border-b border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-[14px] font-bold text-[var(--text)] tracking-tight">
                Interventions
              </h1>
              {openCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--critical-surface)] text-[var(--critical)] border border-[var(--critical-border)] text-[10px] font-mono font-bold">
                  {openCount} OPEN
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(true)}
                title="Keyboard shortcuts (?)"
                className="p-1 rounded-[var(--radius-control)] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                <Kbd>?</Kbd>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter agent, run, tool..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)] pl-8 pr-2.5 py-1 text-[12px] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono">
            {/* Status pills */}
            <div className="flex items-center p-0.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)]">
              {(["ALL", "OPEN", "RESOLVED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-2 py-0.5 rounded-[var(--radius-sm)] transition-colors",
                    statusFilter === s
                      ? "bg-[var(--surface-3)] text-[var(--text)] font-semibold shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Severity pills */}
            <div className="flex items-center p-0.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)]">
              <button
                onClick={() => setSeverityFilter("ALL")}
                className={cn(
                  "px-1.5 py-0.5 rounded-[var(--radius-sm)] transition-colors",
                  severityFilter === "ALL"
                    ? "bg-[var(--surface-3)] text-[var(--text)] font-semibold"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                ALL
              </button>
              <button
                onClick={() => setSeverityFilter("CRITICAL")}
                className={cn(
                  "px-1.5 py-0.5 rounded-[var(--radius-sm)] transition-colors",
                  severityFilter === "CRITICAL"
                    ? "bg-[var(--critical-surface)] text-[var(--critical)] font-bold"
                    : "text-[var(--muted)] hover:text-[var(--critical)]"
                )}
              >
                CRIT ({criticalCount})
              </button>
              <button
                onClick={() => setSeverityFilter("HIGH")}
                className={cn(
                  "px-1.5 py-0.5 rounded-[var(--radius-sm)] transition-colors",
                  severityFilter === "HIGH"
                    ? "bg-[var(--warning-surface)] text-[var(--warning)] font-bold"
                    : "text-[var(--muted)] hover:text-[var(--warning)]"
                )}
              >
                HIGH ({highCount})
              </button>
            </div>
          </div>
        </div>

        {/* Incident List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[12px] text-[var(--muted)] font-mono">No incidents found</p>
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = selectedIndex === index;
              const isCrit = item.severity === "CRITICAL" || item.severity === "HIGH";
              const isMed = item.severity === "MEDIUM";

              return (
                <div
                  key={item.incident_id}
                  data-incident-item="true"
                  onClick={() => selectIncidentByIndex(index)}
                  className={cn(
                    "p-3 cursor-pointer transition-colors text-left relative",
                    isSelected
                      ? "bg-[var(--surface-2)] border-l-2 border-l-[var(--brand)]"
                      : "hover:bg-[var(--surface-2)]/60"
                  )}
                >
                  {/* Top row: Severity dot & label, relative time, status */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <StatusDot
                        status={isCrit ? "critical" : isMed ? "warning" : "neutral"}
                        pulse={item.status === "OPEN" && isCrit}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-mono font-bold tracking-wider uppercase",
                          isCrit
                            ? "text-[var(--critical)]"
                            : isMed
                            ? "text-[var(--warning)]"
                            : "text-[var(--muted)]"
                        )}
                      >
                        {item.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant={item.status === "OPEN" ? "warning" : "ok"} dot>
                        {item.status}
                      </Badge>
                      <span
                        className="text-[11px] font-mono text-[var(--muted)]"
                        title={item.triggered_at}
                      >
                        {relativeTime(item.triggered_at)}
                      </span>
                    </div>
                  </div>

                  {/* Middle row: Failure type */}
                  <div className="text-[13px] font-semibold text-[var(--text)] tracking-tight truncate">
                    {item.failure_type}
                  </div>

                  {/* Bottom row: Agent ID in mono */}
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
                    <span className="truncate max-w-[180px]">{item.agent_id}</span>
                    <span className="text-[10px] text-[var(--muted)] font-mono">
                      {item.incident_id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer pagination info */}
        <div className="p-2.5 border-t border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--muted)] bg-[var(--surface-1)]">
          <span>
            {filtered.length} of {total} incidents
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page of incidents"
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - limit))}
              className="p-1 rounded-[var(--radius-control)] border border-[var(--border)] disabled:opacity-20 hover:bg-[var(--surface-2)] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next page of incidents"
              disabled={skip + limit >= total}
              onClick={() => setSkip(skip + limit)}
              className="p-1 rounded-[var(--radius-control)] border border-[var(--border)] disabled:opacity-20 hover:bg-[var(--surface-2)] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT: Detail Pane */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--bg)]">
        {selectedIncident ? (
          <IncidentDetailPane
            key={selectedIncident.incident_id}
            incident={selectedIncident}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            isApproveDialogOpen={isApproveOpen}
            setIsApproveDialogOpen={setIsApproveOpen}
            isRejectDialogOpen={isRejectOpen}
            setIsRejectDialogOpen={setIsRejectOpen}
          />
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <EmptyState
              icon={ShieldAlert}
              title="No incident selected"
              description="Select an incident from the queue or navigate with keyboard shortcuts."
              action={
                <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--muted)]">
                  <span>Press</span> <Kbd>j</Kbd> / <Kbd>k</Kbd> <span>to move</span>
                </div>
              }
            />
          </div>
        )}
      </main>

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsDialog
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
