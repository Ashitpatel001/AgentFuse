import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Badge, Button, LoadingState, ErrorState } from "../components/ui";
import { relativeTime, cn } from "../utils";
import { AlertTriangle, ArrowLeft, Zap, Copy, ClipboardCheck } from "lucide-react";
import { useRole } from "../hooks/useRole";
import { useState } from "react";

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, handleApiError } = useRole();
  const [copied, setCopied] = useState(false);

  const { data: incident, isLoading: incLoading, error: incError } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => api.getIncident(id!),
    enabled: !!id,
  });

  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ["plan", id],
    queryFn: () => api.getPlan(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approvePlan(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", id] });
      queryClient.invalidateQueries({ queryKey: ["plan", id] });
    },
    onError: handleApiError,
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectPlan(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", id] });
      queryClient.invalidateQueries({ queryKey: ["plan", id] });
    },
    onError: handleApiError,
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.resumeRun(incident?.run_id || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incident", id] });
    },
    onError: handleApiError,
  });

  if (incLoading) return <LoadingState message="Loading incident..." />;
  if (incError) return <ErrorState title="Failed to load incident" error={incError} />;
  if (!incident) return <ErrorState title="Incident not found" />;

  const isViewer = role === "VIEWER";
  const disableActions =
    isViewer || approveMutation.isPending || rejectMutation.isPending || resumeMutation.isPending;

  const handleCopyContext = () => {
    const ctx = `CortexHeal Incident Context
ID: ${incident.incident_id}
Run ID: ${incident.run_id}
Agent ID: ${incident.agent_id}
Failure Type: ${incident.failure_type}
Severity: ${incident.severity}
Status: ${incident.status}

Description:
${incident.description}

Evidence:
${JSON.stringify(incident.evidence, null, 2)}

Observed Value: ${incident.observed_value ?? "N/A"}
Threshold Limit: ${incident.threshold ?? "N/A"}`;

    navigator.clipboard.writeText(ctx).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const severityBorder =
    incident.severity === "CRITICAL" ? "border-l-red-500" :
    incident.severity === "HIGH" ? "border-l-orange-500" :
    incident.severity === "MEDIUM" ? "border-l-amber-500" : "border-l-border-strong";

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-5 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className={cn("bg-bg-raised border border-border-subtle border-l-[3px] rounded-xl p-6", severityBorder)}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                {incident.failure_type}
              </h1>
              <button
                onClick={handleCopyContext}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-overlay text-text-tertiary border border-border-default text-[10px] font-mono uppercase tracking-wider hover:text-text-secondary hover:border-border-strong transition-all"
              >
                {copied ? <ClipboardCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy context"}
              </button>
            </div>
            <p className="text-[14px] text-text-secondary mb-4 max-w-2xl leading-relaxed">
              {incident.description}
            </p>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  incident.severity === "CRITICAL" || incident.severity === "HIGH"
                    ? "red"
                    : incident.severity === "MEDIUM"
                    ? "amber"
                    : "neutral"
                }
                dot
              >
                {incident.severity}
              </Badge>
              <Badge variant={incident.status === "OPEN" ? "amber" : "green"} dot>{incident.status}</Badge>
              <span className="text-text-muted font-mono text-[12px]" title={incident.triggered_at}>
                {relativeTime(incident.triggered_at)}
              </span>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1 font-mono text-[11px]">
            <span className="text-text-muted uppercase tracking-wider text-[9px]">Incident</span>
            <span className="text-text-tertiary text-[11px]">{incident.incident_id.substring(0, 8)}</span>
            <span className="text-text-muted uppercase tracking-wider text-[9px] mt-2">Run</span>
            <Link to={`/runs/${incident.run_id}`} className="text-accent hover:text-accent-hover transition-colors">
              {incident.run_id}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-t border-border-subtle pt-6">
          {/* Evidence */}
          <div className="space-y-5">
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Detection Evidence
              </h3>
              <div className="bg-bg-base border border-border-subtle rounded-xl p-4 space-y-3">
                {Object.entries(incident.evidence || {}).map(([k, v]) => (
                  <div key={k} className="border-b border-border-subtle/50 pb-2 last:border-0 last:pb-0">
                    <div className="text-[9px] uppercase tracking-wider text-text-muted mb-0.5 font-semibold">{k}</div>
                    <div className="font-mono text-[13px] text-text-secondary break-all">{String(v)}</div>
                  </div>
                ))}
                {(incident.observed_value !== undefined || incident.threshold !== undefined) && (
                  <div className="flex gap-6 pt-2 border-t border-border-subtle/50">
                    {incident.observed_value !== undefined && (
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-text-muted font-semibold">Observed</div>
                        <div className="font-mono text-xl text-red-400 font-bold">{incident.observed_value}</div>
                      </div>
                    )}
                    {incident.threshold !== undefined && (
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-text-muted font-semibold">Threshold</div>
                        <div className="font-mono text-xl text-text-secondary">{incident.threshold}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-3">
                System Context
              </h3>
              <div className="bg-bg-base border border-border-subtle rounded-xl p-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-text-muted font-semibold">Detector</div>
                  <div className="font-mono text-[13px] text-text-secondary">
                    {incident.detector} v{incident.detector_version}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-text-muted mb-1 font-semibold">Run Status</div>
                  <Badge
                    variant={
                      incident.run_status === "paused" ? "amber"
                        : incident.run_status === "running" ? "green"
                        : incident.run_status === "failed" ? "red"
                        : "neutral"
                    }
                    dot
                  >
                    {incident.run_status?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </section>
          </div>

          {/* Recovery Plan */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted mb-3 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Recovery Plan
            </h3>
            {planLoading ? (
              <div className="space-y-2">
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-20 w-full mt-3 rounded-xl" />
              </div>
            ) : planError ? (
              <ErrorState title="Failed to load plan" error={planError} />
            ) : plan ? (
              <div className="bg-bg-base border border-border-subtle rounded-xl p-5 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <Badge
                    variant={plan.status === "PROPOSED" ? "amber" : plan.status === "REJECTED" ? "red" : "green"}
                  >
                    PLAN {plan.status}
                  </Badge>
                  <Badge
                    variant={plan.risk_level === "HIGH" ? "red" : plan.risk_level === "MEDIUM" ? "amber" : "neutral"}
                  >
                    {plan.risk_level} RISK
                  </Badge>
                </div>

                <p className="text-[14px] text-text-secondary mb-5 font-medium leading-relaxed">
                  {plan.diagnosis}
                </p>

                {/* Pattern Trust */}
                <div className="mb-5 p-3.5 border border-accent/15 bg-accent/[0.04] rounded-xl">
                  <div className="text-[9px] text-accent uppercase tracking-[0.12em] mb-2 font-bold flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Historical Trust
                  </div>
                  {plan.pattern_trust?.actions?.length > 0 ? (
                    <div className="space-y-1.5">
                      {plan.pattern_trust.actions.map((act: any) => (
                        <div key={act.action} className="text-[12px] text-text-secondary">
                          <span className="font-mono text-accent">{act.action}</span>{" "}
                          <span className="text-emerald-400 font-semibold">
                            {(act.success_rate * 100).toFixed(0)}%
                          </span>{" "}
                          over {act.attempted} attempts
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-text-muted italic">Insufficient data yet.</div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted font-semibold">
                    Proposed Actions
                  </div>
                  {plan.proposed_actions.map((action) => (
                    <div
                      key={action.action_id}
                      className="border border-border-subtle bg-bg-raised rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-accent text-[13px] font-semibold">
                          {action.action_type}
                        </span>
                        <Badge>{action.status}</Badge>
                      </div>
                      <p className="text-[12px] text-text-tertiary">{action.reason}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-border-subtle flex gap-2">
                  {plan.status === "PROPOSED" && incident.status === "OPEN" && (
                    <>
                      <Button
                        variant="primary"
                        disabled={disableActions}
                        loading={approveMutation.isPending}
                        onClick={() => approveMutation.mutate()}
                        className="flex-1"
                      >
                        Approve & Execute
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={disableActions}
                        loading={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate()}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {incident.run_status === "paused" &&
                    (incident.status === "RESOLVED" ||
                      plan.status === "COMPLETED" ||
                      plan.status === "APPROVED") && (
                      <Button
                        variant="primary"
                        disabled={disableActions}
                        loading={resumeMutation.isPending}
                        onClick={() => resumeMutation.mutate()}
                        className="flex-1"
                      >
                        Resume Run
                      </Button>
                    )}
                </div>
                {!!(approveMutation.error || rejectMutation.error || resumeMutation.error) && (
                  <div className="text-[11px] font-mono text-red-400 mt-3 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    Action failed. Check console for details.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
