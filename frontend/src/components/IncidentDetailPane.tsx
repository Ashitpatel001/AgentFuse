import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Clock,
  Coins,
  Cpu,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import type { Incident, TimelineEntry } from "../types";
import { api } from "../api";
import {
  Badge,
  Button,
  StatusDot,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
} from "./ui";
import { relativeTime, cn } from "../utils";
import { useRole } from "../hooks/useRole";

interface IncidentDetailPaneProps {
  incident: Incident;
  onOpenShortcuts?: () => void;
  isApproveDialogOpen?: boolean;
  setIsApproveDialogOpen?: (open: boolean) => void;
  isRejectDialogOpen?: boolean;
  setIsRejectDialogOpen?: (open: boolean) => void;
}

interface CollapsedEvent {
  eventType: string;
  tool?: string;
  argumentsHash?: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
  tokens?: number;
  cost?: number;
  latencyMs?: number;
}

export function IncidentDetailPane({
  incident,
  onOpenShortcuts,
  isApproveDialogOpen: externalApproveOpen,
  setIsApproveDialogOpen: setExternalApproveOpen,
  isRejectDialogOpen: externalRejectOpen,
  setIsRejectDialogOpen: setExternalRejectOpen,
}: IncidentDetailPaneProps) {
  const queryClient = useQueryClient();
  const { role, isOperator, handleApiError } = useRole();

  // Internal dialog states if not controlled externally
  const [internalApproveOpen, setInternalApproveOpen] = useState(false);
  const [internalRejectOpen, setInternalRejectOpen] = useState(false);

  const isApproveOpen = externalApproveOpen ?? internalApproveOpen;
  const setIsApproveOpen = setExternalApproveOpen ?? setInternalApproveOpen;
  const isRejectOpen = externalRejectOpen ?? internalRejectOpen;
  const setIsRejectOpen = setExternalRejectOpen ?? setInternalRejectOpen;

  // Copy feedback states
  const [copiedContext, setCopiedContext] = useState(false);
  const [copiedRunId, setCopiedRunId] = useState(false);
  const [copiedArgsHash, setCopiedArgsHash] = useState(false);
  const [copiedRespHash, setCopiedRespHash] = useState(false);

  // Queries
  const { data: run } = useQuery({
    queryKey: ["run", incident.run_id],
    queryFn: () => api.getRun(incident.run_id),
    enabled: Boolean(incident.run_id),
  });

  const { data: timeline = [], isLoading: timelineLoading } = useQuery<TimelineEntry[]>({
    queryKey: ["timeline", incident.run_id],
    queryFn: () => api.getRunTimeline(incident.run_id),
    enabled: Boolean(incident.run_id),
  });

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["plan", incident.incident_id],
    queryFn: () => api.getPlan(incident.incident_id),
    enabled: Boolean(incident.incident_id),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => api.approvePlan(incident.incident_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", incident.incident_id] });
      queryClient.invalidateQueries({ queryKey: ["plan", incident.incident_id] });
      queryClient.invalidateQueries({ queryKey: ["timeline", incident.run_id] });
      setIsApproveOpen(false);
    },
    onError: handleApiError,
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectPlan(incident.incident_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["incident", incident.incident_id] });
      queryClient.invalidateQueries({ queryKey: ["plan", incident.incident_id] });
      queryClient.invalidateQueries({ queryKey: ["timeline", incident.run_id] });
      setIsRejectOpen(false);
    },
    onError: handleApiError,
  });

  // Role resolution & actions gating
  // Role is resolved before rendering actions so there is NO FLASH of enabled buttons
  const isRoleResolved = role !== "UNKNOWN";
  const canPerformActions = isRoleResolved && isOperator;
  const isViewer = role === "VIEWER";
  const actionsDisabled =
    !canPerformActions ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    incident.status === "RESOLVED";

  // Framework check for AutoGen warning
  const isAutoGen = useMemo(() => {
    const fw = (run?.framework || (incident.evidence?.framework as string) || "").toLowerCase();
    const agent = (incident.agent_id || "").toLowerCase();
    return fw.includes("autogen") || agent.includes("autogen");
  }, [run?.framework, incident.evidence?.framework, incident.agent_id]);

  // Collapsed leading events (last 20 events before/around incident trigger)
  const collapsedEvents = useMemo(() => {
    const rawEvents = (timeline || [])
      .filter((t) => t.type === "event" && t.data)
      .map((t) => t.data as Record<string, any>);

    // Take the last 20 events
    const last20 = rawEvents.slice(-20);
    const groups: CollapsedEvent[] = [];

    for (const ev of last20) {
      const eventType = ev.event_type || "EVENT";
      const tool = ev.tool || "";
      const argsHash = ev.arguments_hash || "";
      const last = groups[groups.length - 1];

      const isSame =
        last &&
        last.eventType === eventType &&
        last.tool === tool &&
        last.argumentsHash === argsHash &&
        (Boolean(tool) || Boolean(argsHash));

      if (isSame) {
        last.count += 1;
        last.lastTimestamp = ev.timestamp || last.lastTimestamp;
        if (ev.tokens?.total) last.tokens = (last.tokens || 0) + ev.tokens.total;
        if (ev.cost) last.cost = (last.cost || 0) + ev.cost;
      } else {
        groups.push({
          eventType,
          tool: ev.tool,
          argumentsHash: ev.arguments_hash,
          count: 1,
          firstTimestamp: ev.timestamp || "",
          lastTimestamp: ev.timestamp || "",
          tokens: ev.tokens?.total,
          cost: ev.cost,
          latencyMs: ev.latency_ms,
        });
      }
    }
    return groups;
  }, [timeline]);

  // Audit events from timeline
  const auditEntries = useMemo(() => {
    return (timeline || [])
      .filter((t) => t.type === "audit" && t.data)
      .map((t) => t.data as Record<string, any>);
  }, [timeline]);

  // Spend and tokens at pause
  const spendAtPause = useMemo(() => {
    if (typeof run?.total_cost === "number") return run.total_cost;
    if (incident.failure_type === "BUDGET_EXCEEDED" && typeof incident.observed_value === "number") {
      return incident.observed_value;
    }
    // Calculate from event costs
    const total = (timeline || [])
      .filter((t) => t.type === "event" && typeof (t.data as Record<string, any>)?.cost === "number")
      .reduce((acc, t) => acc + ((t.data as Record<string, any>).cost as number), 0);
    return total;
  }, [run?.total_cost, incident.failure_type, incident.observed_value, timeline]);

  const tokensAtPause = useMemo(() => {
    if (typeof run?.total_tokens === "number") return run.total_tokens;
    const total = (timeline || [])
      .filter((t) => t.type === "event" && typeof (t.data as Record<string, any>)?.tokens?.total === "number")
      .reduce((acc, t) => acc + ((t.data as Record<string, any>).tokens.total as number), 0);
    return total;
  }, [run?.total_tokens, timeline]);

  // Historical trust text from plan response
  const historicalTrustText = useMemo(() => {
    if (!plan?.pattern_trust || plan.pattern_trust.occurrences === 0) {
      return "No history yet";
    }
    const primaryAction = plan.proposed_actions?.[0]?.action_type;
    const actions = plan.pattern_trust.actions || [];
    const matched = actions.find((a: any) => a.action === primaryAction) || actions[0];

    if (matched && typeof matched.attempted === "number" && matched.attempted > 0) {
      return `Worked ${matched.verified_success} of ${matched.attempted} times for this pattern`;
    }
    return "No history yet";
  }, [plan?.pattern_trust, plan?.proposed_actions]);

  // Evidence hashes and repetitions for STUCK_LOOP
  const evidence = incident.evidence || {};
  const toolName =
    (evidence.tool as string) ||
    (evidence.repeated_tool as string) ||
    (evidence.tool_name as string) ||
    "search_database";
  const rawArgsHash = (evidence.arguments_hash as string) || (evidence.args_hash as string) || "";
  const rawRespHash = (evidence.response_hash as string) || (evidence.resp_hash as string) || "";
  const shortArgsHash = rawArgsHash ? rawArgsHash.slice(0, 10) : "n/a";
  const shortRespHash = rawRespHash ? rawRespHash.slice(0, 10) : "n/a";

  const repetitionCount =
    typeof incident.observed_value === "number"
      ? incident.observed_value
      : typeof evidence.repetitions === "number"
      ? evidence.repetitions
      : 4;
  const repetitionThreshold =
    typeof incident.threshold === "number"
      ? incident.threshold
      : typeof evidence.threshold === "number"
      ? evidence.threshold
      : 4;

  // Copy handlers
  const handleCopyRunId = () => {
    navigator.clipboard.writeText(incident.run_id);
    setCopiedRunId(true);
    setTimeout(() => setCopiedRunId(false), 2000);
  };

  const handleCopyArgsHash = () => {
    if (rawArgsHash) {
      navigator.clipboard.writeText(rawArgsHash);
      setCopiedArgsHash(true);
      setTimeout(() => setCopiedArgsHash(false), 2000);
    }
  };

  const handleCopyRespHash = () => {
    if (rawRespHash) {
      navigator.clipboard.writeText(rawRespHash);
      setCopiedRespHash(true);
      setTimeout(() => setCopiedRespHash(false), 2000);
    }
  };

  const handleCopyAiContext = () => {
    const aiContext = `### AgentFuse Incident Context
- Incident ID: ${incident.incident_id}
- Run ID: ${incident.run_id}
- Agent ID: ${incident.agent_id}
- Failure Type: ${incident.failure_type}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Triggered At: ${incident.triggered_at}
- Protection Mode: ${incident.protection_mode || run?.protection_mode || "ACTIVE"}

### Why It Tripped
- Rule: ${incident.detector || "deterministic_safety_gate"}
- Threshold: ${incident.threshold ?? "N/A"}
- Observed: ${incident.observed_value ?? "N/A"}
- Tool: ${toolName}
- Arguments Hash: ${rawArgsHash || "N/A"}
- Response Hash: ${rawRespHash || "N/A"}
- Repetitions: ${repetitionCount} / ${repetitionThreshold}
- Note: Decided by a deterministic rule. No LLM involved.

### What AgentFuse Did
- Paused At: ${incident.triggered_at}
- Spend at pause: $${spendAtPause.toFixed(4)}
- Tokens: ${tokensAtPause}

### Recovery Plan
- Proposed Action: ${plan?.proposed_actions?.[0]?.action_type || "RESUME"}
- Risk Level: ${plan?.risk_level || "LOW"}
- Historical Trust: ${historicalTrustText}
- Diagnosis: ${plan?.diagnosis || incident.description}
${isAutoGen ? "- Warning: AutoGen run: conversation must be rebuilt before resuming.\n" : ""}
### Audit Trail
${
  auditEntries.length > 0
    ? auditEntries
        .map(
          (a) =>
            `- [${a.timestamp}] ${a.action} by ${a.actor_id || "BLOCKED (API does not return actor)"} (${a.actor_type || "SYSTEM"}): ${a.result} - ${a.reason || "none"}`
        )
        .join("\n")
    : "- No audit trail entries recorded yet."
}`;

    navigator.clipboard.writeText(aiContext);
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };

  // Severity color mapping
  const severityVariant =
    incident.severity === "CRITICAL"
      ? "critical"
      : incident.severity === "HIGH"
      ? "critical"
      : incident.severity === "MEDIUM"
      ? "warning"
      : "neutral";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. Header */}
      <div className="p-4 sm:p-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityVariant} dot>
                {incident.severity}
              </Badge>
              <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">
                {incident.failure_type}
              </h1>
              <Badge variant={incident.status === "OPEN" ? "warning" : "ok"} dot>
                {incident.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--muted)]">
              <span>
                Agent:{" "}
                <span className="font-mono text-[var(--text)] font-medium">
                  {incident.agent_id}
                </span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                Run ID:{" "}
                <Link
                  to={`/runs/${incident.run_id}`}
                  className="font-mono text-[var(--info)] hover:underline inline-flex items-center gap-1"
                >
                  {incident.run_id}
                  <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                </Link>
                <button
                  type="button"
                  onClick={handleCopyRunId}
                  title="Copy Run ID"
                  aria-label="Copy Run ID"
                  className="p-1 rounded-[var(--radius-control)] hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  {copiedRunId ? (
                    <Check className="w-3 h-3 text-[var(--ok)]" strokeWidth={1.5} />
                  ) : (
                    <Copy className="w-3 h-3" strokeWidth={1.5} />
                  )}
                </button>
              </span>
              <span>•</span>
              <span
                className="font-mono text-[var(--text)]"
                title={incident.triggered_at}
              >
                {relativeTime(incident.triggered_at)}
              </span>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyAiContext}
              title="Copy incident context for AI prompt (Hotkey: c)"
            >
              {copiedContext ? (
                <Check className="w-3.5 h-3.5 text-[var(--ok)] mr-1.5" strokeWidth={1.5} />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
              )}
              {copiedContext ? "Copied Context" : "Copy AI Context"}
            </Button>

            {Boolean(onOpenShortcuts) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenShortcuts}
                title="Keyboard Shortcuts (Hotkey: ?)"
              >
                <HelpCircle className="w-4 h-4 text-[var(--muted)]" strokeWidth={1.5} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. "Why it tripped" */}
      <section className="p-4 sm:p-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <h2 className="text-[14px] font-semibold text-[var(--text)] uppercase tracking-wider font-mono">
            Why it tripped
          </h2>
          <span className="text-[11px] font-mono text-[var(--muted)]">
            Rule: {incident.detector || "deterministic_circuit_breaker"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
            <span className="text-[11px] text-[var(--muted)] block font-mono">Rule Name</span>
            <span className="font-mono font-medium text-[var(--text)] truncate block mt-0.5">
              {incident.detector || (incident.failure_type === "STUCK_LOOP" ? "stuck_loop_detector" : "budget_ceiling_detector")}
            </span>
          </div>
          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
            <span className="text-[11px] text-[var(--muted)] block font-mono">Threshold Limit</span>
            <span className="font-mono font-medium text-[var(--text)] block mt-0.5">
              {String(incident.threshold ?? "4")}
            </span>
          </div>
          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
            <span className="text-[11px] text-[var(--muted)] block font-mono">Observed Value</span>
            <span className="font-mono font-medium text-[var(--critical)] block mt-0.5">
              {String(incident.observed_value ?? "4")}
            </span>
          </div>
        </div>

        {/* Failure-specific details */}
        {incident.failure_type === "STUCK_LOOP" && (
          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[12px]">
                <span className="text-[var(--muted)]">Repeated Tool:</span>{" "}
                <span className="font-mono font-bold text-[var(--text)] px-1.5 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border)]">
                  {toolName}
                </span>
              </div>

              {/* Repetition count as pips */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-[var(--muted)]">Repetitions:</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.max(repetitionCount, repetitionThreshold, 4) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full transition-colors",
                          i < repetitionCount
                            ? "bg-[var(--critical)]"
                            : "bg-[var(--surface-3)] border border-[var(--border-strong)]"
                        )}
                        title={`Iteration ${i + 1}`}
                      />
                    )
                  )}
                </div>
                <span className="font-mono text-[11px] text-[var(--text)] ml-1">
                  ({repetitionCount}/{repetitionThreshold})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] font-mono">
              <div className="flex items-center justify-between p-2 rounded bg-[var(--surface-1)] border border-[var(--border)]">
                <div>
                  <span className="text-[var(--muted)] text-[11px] block">Args Hash</span>
                  <span className="text-[var(--text)]">{shortArgsHash}</span>
                </div>
                {Boolean(rawArgsHash) && (
                  <button
                    type="button"
                    onClick={handleCopyArgsHash}
                    aria-label="Copy full arguments hash"
                    className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    title="Copy full arguments hash"
                  >
                    {copiedArgsHash ? (
                      <Check className="w-3.5 h-3.5 text-[var(--ok)]" strokeWidth={1.5} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-[var(--surface-1)] border border-[var(--border)]">
                <div>
                  <span className="text-[var(--muted)] text-[11px] block">Response Hash</span>
                  <span className="text-[var(--text)]">{shortRespHash}</span>
                </div>
                {Boolean(rawRespHash) && (
                  <button
                    type="button"
                    onClick={handleCopyRespHash}
                    aria-label="Copy full response hash"
                    className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    title="Copy full response hash"
                  >
                    {copiedRespHash ? (
                      <Check className="w-3.5 h-3.5 text-[var(--ok)]" strokeWidth={1.5} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {incident.failure_type === "BUDGET_EXCEEDED" && (
          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-[12px] font-mono">
              <span className="text-[var(--muted)]">Spend against ceiling:</span>
              <span className="text-[var(--critical)] font-bold">
                ${spendAtPause.toFixed(4)} / ${Number(incident.threshold || 0).toFixed(4)}
              </span>
            </div>
            {/* Ceiling progress bar */}
            <div className="w-full h-2 rounded-full bg-[var(--surface-3)] overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-[var(--critical)]"
                style={{
                  width: `${Math.min(
                    100,
                    (spendAtPause / Math.max(0.0001, Number(incident.threshold || 1))) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Thesis Footer Line */}
        <div className="pt-2 border-t border-[var(--border)]">
          <p className="text-[11px] font-mono text-[var(--muted)] text-right">
            Decided by a deterministic rule. No LLM involved.
          </p>
        </div>
      </section>

      {/* 3. "Leading up to it" */}
      <section className="p-4 sm:p-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <h2 className="text-[14px] font-semibold text-[var(--text)] uppercase tracking-wider font-mono">
            Leading up to it
          </h2>
          <span className="text-[11px] font-mono text-[var(--muted)]">
            Last 20 events from the run timeline in mono
          </span>
        </div>

        {timelineLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : collapsedEvents.length === 0 ? (
          <div className="p-4 text-center text-[12px] font-mono text-[var(--muted)] bg-[var(--surface-2)] rounded-[var(--radius-control)]">
            No preceding telemetry events found for this run.
          </div>
        ) : (
          <div className="p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)] font-mono text-[12px] space-y-1.5 overflow-x-auto max-h-72">
            {collapsedEvents.map((group, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 py-0.5",
                  group.count > 1 ? "text-[var(--warning)]" : "text-[var(--text)]"
                )}
              >
                <span className="text-[var(--faint)] shrink-0 select-none">
                  [{group.lastTimestamp ? group.lastTimestamp.split("T")[1]?.slice(0, 12) : "00:00:00"}]
                </span>

                {group.count > 1 ? (
                  <span className="font-semibold">
                    [x{group.count} identical calls]{" "}
                    <span className="text-[var(--text)] font-normal">
                      tool: {group.tool || group.eventType}{" "}
                      {group.argumentsHash && `(args_hash: ${group.argumentsHash.slice(0, 8)}...)`}
                    </span>
                  </span>
                ) : (
                  <span>
                    <span className="text-[var(--info)]">{group.eventType}</span>
                    {group.tool && <span> tool={group.tool}</span>}
                    {group.argumentsHash && (
                      <span className="text-[var(--muted)]">
                        {" "}
                        (args_hash={group.argumentsHash.slice(0, 8)})
                      </span>
                    )}
                    {typeof group.latencyMs === "number" && (
                      <span className="text-[var(--faint)]"> {group.latencyMs}ms</span>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. "What AgentFuse did" */}
      <section className="p-4 sm:p-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <h2 className="text-[14px] font-semibold text-[var(--text)] uppercase tracking-wider font-mono">
            What AgentFuse did
          </h2>
          <span className="text-[11px] font-mono text-[var(--ok)] flex items-center gap-1.5">
            <StatusDot status="ok" />
            Circuit Breaker Intervened
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-3">
            <Clock className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={1.5} />
            <div>
              <span className="text-[11px] font-mono text-[var(--muted)] block">Paused at</span>
              <span
                className="text-[13px] font-mono font-medium text-[var(--text)]"
                title={incident.triggered_at}
              >
                {relativeTime(incident.triggered_at)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-3">
            <Coins className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={1.5} />
            <div>
              {/* STRICT RULE: always labeled "spend at pause", never "saved" */}
              <span className="text-[11px] font-mono text-[var(--muted)] block">Spend at pause</span>
              <span className="text-[13px] font-mono font-medium text-[var(--text)] tabular-nums">
                ${spendAtPause.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-3">
            <Cpu className="w-4 h-4 text-[var(--muted)] shrink-0" strokeWidth={1.5} />
            <div>
              <span className="text-[11px] font-mono text-[var(--muted)] block">Tokens</span>
              <span className="text-[13px] font-mono font-medium text-[var(--text)] tabular-nums">
                {tokensAtPause > 0 ? tokensAtPause.toLocaleString() : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Recovery plan */}
      <section className="p-4 sm:p-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <h2 className="text-[14px] font-semibold text-[var(--text)] uppercase tracking-wider font-mono">
            Recovery plan
          </h2>
          {plan && (
            <Badge
              variant={
                plan.risk_level === "HIGH"
                  ? "critical"
                  : plan.risk_level === "MEDIUM"
                  ? "warning"
                  : "ok"
              }
            >
              Risk: {plan.risk_level}
            </Badge>
          )}
        </div>

        {isAutoGen && (
          <div className="p-3 rounded-[var(--radius-control)] bg-[var(--warning-surface)] border border-[var(--warning-border)] text-[var(--warning)] text-[12px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--warning)]" strokeWidth={1.5} />
            <span>
              <strong>AutoGen run:</strong> conversation must be rebuilt before resuming.
            </span>
          </div>
        )}

        {planLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[11px] font-mono text-[var(--muted)] block">Proposed Action</span>
                <span className="font-mono font-bold text-[var(--text)] block mt-0.5">
                  {plan?.proposed_actions?.[0]?.action_type || "RESUME"}
                </span>
                <span className="text-[11px] text-[var(--muted)] block mt-1">
                  {plan?.proposed_actions?.[0]?.reason || plan?.diagnosis || "Resume run execution"}
                </span>
              </div>

              <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)]">
                <span className="text-[11px] font-mono text-[var(--muted)] block">Historical Trust</span>
                <span className="font-mono font-medium text-[var(--text)] block mt-0.5">
                  {historicalTrustText}
                </span>
                <span className="text-[11px] text-[var(--muted)] block mt-1">
                  Frequentist/Bayesian verification history
                </span>
              </div>
            </div>

            {/* Actions: Primary Approve, Ghost Reject */}
            <div className="flex items-center gap-3 pt-2">
              {isViewer ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="primary" disabled>
                        Approve
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Viewers cannot approve or reject recovery plans.</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="primary"
                  disabled={actionsDisabled}
                  loading={approveMutation.isPending}
                  onClick={() => setIsApproveOpen(true)}
                  title="Approve recovery plan (Hotkey: a)"
                >
                  Approve
                </Button>
              )}

              {isViewer ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="ghost" disabled>
                        Reject
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Viewers cannot approve or reject recovery plans.</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  disabled={actionsDisabled}
                  loading={rejectMutation.isPending}
                  onClick={() => setIsRejectOpen(true)}
                  title="Reject recovery plan (Hotkey: x)"
                >
                  Reject
                </Button>
              )}

              {incident.status === "RESOLVED" && (
                <span className="text-[12px] font-mono text-[var(--ok)] flex items-center gap-1.5 ml-2">
                  <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                  Incident resolved
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 6. Audit trail */}
      <section className="p-4 sm:p-5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <h2 className="text-[14px] font-semibold text-[var(--text)] uppercase tracking-wider font-mono">
            Audit trail
          </h2>
          <span className="text-[11px] font-mono text-[var(--muted)]">
            Deterministic state transitions & operator actions
          </span>
        </div>

        {timelineLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : auditEntries.length === 0 ? (
          <div className="p-4 text-center text-[12px] font-mono text-[var(--muted)] bg-[var(--surface-2)] rounded-[var(--radius-control)]">
            No audit records found for this run.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-[var(--radius-control)] bg-[var(--surface-2)] overflow-hidden">
            {auditEntries.map((audit, idx) => (
              <div key={idx} className="p-3 text-[12px] flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-[var(--text)]">
                      {audit.action}
                    </span>
                    <Badge
                      variant={
                        audit.result === "SUCCESS"
                          ? "ok"
                          : audit.result === "FAILURE"
                          ? "critical"
                          : "neutral"
                      }
                    >
                      {audit.result}
                    </Badge>
                  </div>

                  {/* Show actor ONLY if API returns one; otherwise omitted */}
                  <div className="text-[11px] text-[var(--muted)]">
                    {audit.actor_id ? (
                      <span>
                        Actor:{" "}
                        <span className="font-mono text-[var(--text)] font-medium">
                          {audit.actor_id}
                        </span>{" "}
                        ({audit.actor_type || "SYSTEM"})
                      </span>
                    ) : (
                      <span className="text-[var(--faint)]">
                        Actor: omitted (not provided by API)
                      </span>
                    )}
                    {audit.reason && <span> — {audit.reason}</span>}
                  </div>
                </div>

                <span
                  className="font-mono text-[11px] text-[var(--muted)] shrink-0"
                  title={audit.timestamp}
                >
                  {relativeTime(audit.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirmation Dialog: Approve */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text)]">
              Confirm Plan Approval
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[var(--muted)]">
              This action executes the recovery plan and resumes agent execution.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-2 text-[12px]">
            <div>
              <span className="text-[var(--muted)]">Action to execute:</span>{" "}
              <strong className="font-mono text-[var(--text)]">
                {plan?.proposed_actions?.[0]?.action_type || "RESUME"}
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted)]">Target Run:</span>{" "}
              <span className="font-mono text-[var(--text)]">{incident.run_id}</span>
            </div>
            <p className="text-[var(--muted)] pt-1 text-[11px] border-t border-[var(--border)]">
              Consequence: The circuit breaker gate will be lifted and telemetry ingestion
              will resume. Ensure external systems are prepared.
            </p>
          </div>

          {isAutoGen && (
            <div className="p-3 rounded-[var(--radius-control)] bg-[var(--warning-surface)] border border-[var(--warning-border)] text-[var(--warning)] text-[12px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--warning)]" strokeWidth={1.5} />
              <span>
                <strong>Warning:</strong> AutoGen run — conversation must be rebuilt before resuming.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsApproveOpen(false)}
              disabled={approveMutation.isPending}
            >
              Cancel (Esc)
            </Button>
            <Button
              variant="primary"
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              Approve and Resume (Enter)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Reject */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[var(--text)]">
              Confirm Plan Rejection
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[var(--muted)]">
              Consequence: The recovery plan will be marked rejected and the agent run will remain paused.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1 text-[12px]">
            <div>
              <span className="text-[var(--muted)]">Incident:</span>{" "}
              <span className="font-mono text-[var(--text)]">{incident.incident_id}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Run ID:</span>{" "}
              <span className="font-mono text-[var(--text)]">{incident.run_id}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsRejectOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel (Esc)
            </Button>
            <Button
              variant="danger"
              loading={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate()}
            >
              Reject Plan (Enter)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
