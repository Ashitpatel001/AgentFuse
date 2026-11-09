import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, AlertTriangle, Zap, ExternalLink } from "lucide-react";
import type { Incident } from "../types";
import { api } from "../api";
import { Badge, Button } from "./ui";
import { relativeTime, cn } from "../utils";
import { useRole } from "../hooks/useRole";

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "CRITICAL") return <Badge variant="red" dot>{severity}</Badge>;
  if (severity === "HIGH") return <Badge variant="red">{severity}</Badge>;
  if (severity === "MEDIUM") return <Badge variant="amber">{severity}</Badge>;
  return <Badge>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "OPEN") return <Badge variant="amber" dot>{status}</Badge>;
  if (status === "RESOLVED") return <Badge variant="green">{status}</Badge>;
  return <Badge>{status}</Badge>;
}

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
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function severityClass(severity: string) {
  if (severity === "CRITICAL") return "severity-critical";
  if (severity === "HIGH") return "severity-high";
  if (severity === "MEDIUM") return "severity-medium";
  return "severity-low";
}

export function IncidentRow({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(false);
  const { role, handleApiError } = useRole();
  const queryClient = useQueryClient();

  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ["plan", incident.incident_id],
    queryFn: () => api.getPlan(incident.incident_id),
    enabled: expanded,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approvePlan(incident.incident_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["plan", incident.incident_id] });
    },
    onError: handleApiError,
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectPlan(incident.incident_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["plan", incident.incident_id] });
    },
    onError: handleApiError,
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.resumeRun(incident.run_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: handleApiError,
  });

  const isViewer = role === "VIEWER";
  const disableActions =
    isViewer || approveMutation.isPending || rejectMutation.isPending || resumeMutation.isPending;

  return (
    <div
      className={cn(
        "bg-bg-raised border rounded-xl transition-all duration-150",
        severityClass(incident.severity),
        expanded ? "border-border-strong ring-1 ring-white/[0.03]" : "border-border-subtle hover:border-border-default"
      )}
    >
      {/* Row header */}
      <div
        className="flex items-center p-4 cursor-pointer gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-text-muted">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        <div className="flex-1 grid grid-cols-12 gap-3 items-center">
          <div className="col-span-3 flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-text-primary">{incident.failure_type}</span>
            <div className="flex gap-1.5">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
          </div>

          <div className="col-span-5 flex flex-col gap-1">
            <span className="text-[13px] text-text-secondary truncate" title={incident.description}>
              {incident.description}
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
              <Link
                to={`/runs/${incident.run_id}`}
                className="hover:text-accent transition-colors"
                onClick={(e) => e.stopPropagation()}
                title={incident.run_id}
              >
                {incident.run_id}
              </Link>
              <span className="text-text-muted/30">|</span>
              <span title={incident.triggered_at}>{relativeTime(incident.triggered_at)}</span>
            </div>
          </div>

          <div className="col-span-2 flex items-center">
            <RunStatusBadge status={incident.run_status} />
          </div>

          <div className="col-span-2 flex justify-end">
            <Link
              to={`/incidents/${incident.incident_id}`}
              className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-accent font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Details
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border-subtle p-5 grid grid-cols-2 gap-6 animate-slide-down">
          {/* Evidence */}
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Detection Evidence
            </h4>
            <div className="bg-bg-base rounded-xl border border-border-subtle p-3 space-y-2">
              {Object.entries(incident.evidence || {}).map(([key, value]) => (
                <div key={key} className="flex flex-col border-b border-border-subtle/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-[9px] uppercase tracking-wider text-text-muted font-semibold">{key}</span>
                  <span className="text-[12px] font-mono text-text-secondary break-all">{String(value)}</span>
                </div>
              ))}
            </div>
            {(incident.observed_value !== undefined || incident.threshold !== undefined) && (
              <div className="mt-3 flex gap-6 text-[13px] font-mono">
                {incident.observed_value !== undefined && (
                  <div>
                    <span className="text-text-muted text-[10px] uppercase tracking-wider">Observed </span>
                    <span className="text-red-400 font-semibold">{incident.observed_value}</span>
                  </div>
                )}
                {incident.threshold !== undefined && (
                  <div>
                    <span className="text-text-muted text-[10px] uppercase tracking-wider">Threshold </span>
                    <span className="text-text-secondary">{incident.threshold}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recovery Plan */}
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-3 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Recovery Plan
            </h4>

            {planLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-8 w-32 mt-4 rounded-lg" />
              </div>
            ) : planError ? (
              <p className="text-[12px] text-text-muted italic">No plan available for this incident.</p>
            ) : plan ? (
              <div className="space-y-3">
                <div className="bg-bg-base rounded-xl border border-border-subtle p-3">
                  <p className="text-[13px] text-text-secondary mb-2.5 leading-relaxed">{plan.diagnosis}</p>
                  <div className="flex gap-1.5">
                    <Badge variant={plan.risk_level === "HIGH" ? "red" : plan.risk_level === "MEDIUM" ? "amber" : "neutral"}>
                      Risk: {plan.risk_level}
                    </Badge>
                    <Badge variant={plan.status === "PROPOSED" ? "amber" : plan.status === "REJECTED" ? "red" : "green"}>
                      {plan.status}
                    </Badge>
                  </div>
                </div>

                {plan.status === "PROPOSED" && incident.status === "OPEN" && (
                  <div className="flex gap-2 pt-1" title={isViewer ? "Requires OPERATOR or ADMIN role" : ""}>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={disableActions}
                      loading={approveMutation.isPending}
                      onClick={() => approveMutation.mutate()}
                    >
                      Approve Plan
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={disableActions}
                      loading={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate()}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {incident.run_status === "paused" &&
                  (incident.status === "RESOLVED" || plan.status === "COMPLETED" || plan.status === "APPROVED") && (
                    <div className="flex gap-2 pt-1" title={isViewer ? "Requires OPERATOR or ADMIN role" : ""}>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={disableActions}
                        loading={resumeMutation.isPending}
                        onClick={() => resumeMutation.mutate()}
                      >
                        Resume Run
                      </Button>
                    </div>
                  )}

                {!!(approveMutation.error || rejectMutation.error || resumeMutation.error) && (
                  <p className="text-[11px] font-mono text-red-400 mt-1">Action failed.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
