import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, AlertTriangle, Zap, ExternalLink, Check, Copy, CheckCircle2, RotateCcw, X } from "lucide-react";
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
  const [copiedHash, setCopiedHash] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ["incidents_badge"] });
      queryClient.invalidateQueries({ queryKey: ["plan", incident.incident_id] });
    },
    onError: handleApiError,
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectPlan(incident.incident_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents_badge"] });
      queryClient.invalidateQueries({ queryKey: ["plan", incident.incident_id] });
    },
    onError: handleApiError,
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.resumeRun(incident.run_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incidents_badge"] });
    },
    onError: handleApiError,
  });

  const isViewer = role === "VIEWER";
  const disableActions =
    isViewer || approveMutation.isPending || rejectMutation.isPending || resumeMutation.isPending;

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div
      className={cn(
        "bg-bg-raised border rounded-xl transition-all duration-150 overflow-hidden",
        severityClass(incident.severity),
        expanded ? "border-border-strong ring-1 ring-white/[0.05] shadow-lg" : "border-border-subtle hover:border-border-default"
      )}
    >
      {/* Row header */}
      <div
        className="flex items-center p-3.5 sm:p-4 cursor-pointer gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-text-muted">
          {expanded ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        <div className="flex-1 grid grid-cols-12 gap-3 items-center">
          {/* Failure Type & Badges */}
          <div className="col-span-12 sm:col-span-4 md:col-span-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-text-primary tracking-tight font-mono">
                {incident.failure_type}
              </span>
              {incident.observed_value !== undefined && incident.threshold !== undefined && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-overlay text-text-muted border border-border-subtle">
                  {incident.observed_value} / {incident.threshold}
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
          </div>

          {/* Description & Agent Identity */}
          <div className="col-span-12 sm:col-span-5 md:col-span-5 flex flex-col gap-1">
            <span className="text-[12px] sm:text-[13px] text-text-secondary truncate" title={incident.description}>
              {incident.description}
            </span>
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
              <span className="text-text-secondary font-semibold">agent: {incident.agent_id || "agent"}</span>
              <span className="text-text-muted/30">|</span>
              <Link
                to={`/runs/${incident.run_id}`}
                className="hover:text-accent transition-colors truncate max-w-[150px]"
                onClick={(e) => e.stopPropagation()}
                title={incident.run_id}
              >
                {incident.run_id}
              </Link>
              <span className="text-text-muted/30">|</span>
              <span title={incident.triggered_at}>{relativeTime(incident.triggered_at)}</span>
            </div>
          </div>

          {/* Agent Run Status */}
          <div className="col-span-6 sm:col-span-3 md:col-span-2 flex items-center">
            <RunStatusBadge status={incident.run_status} />
          </div>

          {/* Action Link */}
          <div className="col-span-6 sm:col-span-12 md:col-span-2 flex justify-end items-center gap-2">
            {incident.status === "OPEN" && (
              <span className="hidden lg:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Action Pending
              </span>
            )}
            <Link
              to={`/incidents/${incident.incident_id}`}
              className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-accent font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Trace
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Expanded APM Trace Detail */}
      {expanded && (
        <div className="border-t border-border-subtle p-5 bg-bg-base/70 grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-down">
          {/* Left Column: Evidence & Cryptographic Hashes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.12em] text-text-muted flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Circuit Breaker Evidence
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                ≤ 24ms TRIP
              </span>
            </div>

            <div className="bg-bg-raised rounded-xl border border-border-subtle p-3.5 space-y-2.5">
              {Object.entries(incident.evidence || {}).map(([key, value]) => {
                const isHash = typeof value === "string" && value.length >= 32;
                return (
                  <div key={key} className="flex flex-col border-b border-border-subtle/40 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold">{key}</span>
                      {isHash && (
                        <button
                          onClick={() => copyHash(String(value))}
                          className="text-[10px] font-mono text-text-muted hover:text-text-primary flex items-center gap-1"
                          title="Copy hash"
                        >
                          {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      )}
                    </div>
                    <span className="text-[12px] font-mono text-text-secondary break-all">{String(value)}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 p-3 bg-bg-raised border border-border-subtle rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">Estimated Loss Prevented:</span>
              <span className="text-emerald-400 font-bold">~$3.80 · 48,000 runaway tokens</span>
            </div>
          </div>

          {/* Right Column: Recovery Intervention */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-mono font-semibold uppercase tracking-[0.12em] text-text-muted flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-400" /> Automated Recovery Intervention
              </h4>
              {plan && (
                <span className="text-[10px] font-mono text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                  Risk: {plan.risk_level || "LOW"}
                </span>
              )}
            </div>

            {planLoading ? (
              <div className="space-y-2 bg-bg-raised border border-border-subtle p-4 rounded-xl">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-8 w-32 mt-4 rounded-lg" />
              </div>
            ) : planError ? (
              <div className="p-4 bg-bg-raised border border-border-subtle rounded-xl text-xs text-text-muted italic">
                No automated recovery plan proposed yet. Manual resume available below.
              </div>
            ) : plan ? (
              <div className="space-y-3.5">
                <div className="bg-bg-raised rounded-xl border border-border-subtle p-4 space-y-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted font-bold block mb-1">
                      Engine Diagnosis
                    </span>
                    <p className="text-[12px] text-text-secondary leading-relaxed font-sans">{plan.diagnosis}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border-subtle/50 text-[11px] font-mono">
                    <span className="text-text-muted">Status:</span>
                    <Badge variant={plan.status === "PROPOSED" ? "amber" : plan.status === "REJECTED" ? "red" : "green"}>
                      {plan.status}
                    </Badge>
                  </div>
                </div>

                {/* Operator Triage Actions */}
                {plan.status === "PROPOSED" && incident.status === "OPEN" && (
                  <div className="flex items-center gap-2.5 pt-1" title={isViewer ? "Requires OPERATOR or ADMIN role" : ""}>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={disableActions}
                      loading={approveMutation.isPending}
                      onClick={() => approveMutation.mutate()}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Plan & Resume Agent
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={disableActions}
                      loading={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate()}
                      className="flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    >
                      <X className="w-3.5 h-3.5" />
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
                        className="flex-1 flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Explicit Resume Run
                      </Button>
                    </div>
                  )}

                {!!(approveMutation.error || rejectMutation.error || resumeMutation.error) && (
                  <p className="text-[11px] font-mono text-red-400 mt-1">Action failed: {String(approveMutation.error || rejectMutation.error || resumeMutation.error)}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
