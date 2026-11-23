import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type MetricsSummary } from "../api";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  StatusDot,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  CodeBlock,
  LoadingState,
  ErrorState,
} from "../components/ui";
import { relativeTime, cn } from "../utils";
import { Server, Copy, Check } from "lucide-react";

interface FleetAgent {
  agent_id: string;
  run_id: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  protection_mode?: string;
  event_count?: number;
  framework?: string;
  total_cost?: number;
}

export function FleetView() {
  const [flashingAgents, setFlashingAgents] = useState<Record<string, boolean>>({});
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Queries
  const { data: fleet = [], isLoading: fleetLoading, error: fleetError } = useQuery<FleetAgent[]>({
    queryKey: ["fleet"],
    queryFn: () => api.getFleet(),
    refetchInterval: 5000,
  });

  const { data: metrics } = useQuery<MetricsSummary>({
    queryKey: ["metrics"],
    queryFn: () => api.getMetrics(),
    refetchInterval: 5000,
  });

  // Listen to SSE changes to trigger 600ms row flash
  const { data: lastSseEvent } = useQuery<{ event: string; data: Record<string, unknown>; timestamp: number }>({
    queryKey: ["sse_last_event"],
    enabled: false,
  });

  useEffect(() => {
    if (lastSseEvent?.data) {
      const agentId = (lastSseEvent.data.agent_id as string) || "";
      const runId = (lastSseEvent.data.run_id as string) || "";

      // Find matching agent
      const matched = fleet.find((a) => a.agent_id === agentId || a.run_id === runId);
      if (matched) {
        setFlashingAgents((prev) => ({ ...prev, [matched.agent_id]: true }));
        const t = setTimeout(() => {
          setFlashingAgents((prev) => {
            const next = { ...prev };
            delete next[matched.agent_id];
            return next;
          });
        }, 600);
        return () => clearTimeout(t);
      }
    }
  }, [lastSseEvent, fleet]);

  // Verified 3-line snippet with key placeholder (from README)
  const setupSnippet = `# Verified LangGraph in-process safety gate (3 lines)
from agentfuse import AgentFuse, LangGraphAdapter
fuse = AgentFuse(adapter=LangGraphAdapter(agent_id="my-agent"))
builder.add_node("safety_gate", fuse.safety_gate)`;

  const handleCopySetupPrompt = () => {
    const promptText = `Please integrate AgentFuse runtime safety and loop protection into this LangGraph project:

1. Install the agentfuse package:
   pip install agentfuse

2. Provide your API key as an environment variable (never hardcode in source):
   export AGENTFUSE_API_KEY="af_live_YOUR_KEY_HERE"

3. Attach the deterministic safety gate at your StateGraph entry point:
   from agentfuse import AgentFuse, LangGraphAdapter
   fuse = AgentFuse(adapter=LangGraphAdapter(agent_id="my-agent"))
   builder.add_node("safety_gate", fuse.safety_gate)
   builder.set_entry_point("safety_gate")
   builder.add_edge("safety_gate", "agent_worker")
   builder.add_edge("agent_worker", "safety_gate")

4. Compile and run your graph. Execution tool-telemetry and state transitions will stream directly into the AgentFuse control plane console over SSE.`;

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  if (fleetLoading && !fleet.length) return <LoadingState message="Loading fleet status..." />;
  if (fleetError) return <ErrorState title="Failed to load fleet" error={fleetError} />;

  // Summary strip numbers
  const runningAgentsCount = fleet.filter((a) =>
    ["running", "resuming", "resume_requested"].includes(a.status.toLowerCase())
  ).length;

  const openIncidentsCount = metrics?.incidents_detected ?? 0;
  const pausedRunsCount =
    fleet.filter((a) => ["paused", "pause_requested"].includes(a.status.toLowerCase())).length ||
    (metrics?.runs_flagged ?? 0);
  const spendAtPause7d = metrics?.cost_on_flagged_runs_usd ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">Fleet Status</h1>
          <p className="text-[12px] text-[var(--muted)] font-mono">
            Tracked agents, runtime protection gates, and execution telemetry
          </p>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[11px] font-mono">
          <StatusDot status="ok" pulse />
          <span className="text-[var(--text)] font-semibold">Active Fleet</span>
          <span className="text-[var(--muted)]">•</span>
          <span className="text-[var(--muted)]">{fleet.length} Agents</span>
        </div>
      </div>

      {/* Summary Strip (4 numbers with exact definitions on hover) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-3.5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] cursor-help transition-colors hover:border-[var(--border-strong)]">
              <span className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider block">
                Agents Running
              </span>
              <span className="text-[20px] font-bold font-mono text-[var(--text)] block mt-1 tabular-nums">
                {runningAgentsCount}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            Count of distinct agent processes currently executing tasks.
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-3.5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] cursor-help transition-colors hover:border-[var(--border-strong)]">
              <span className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider block">
                Open Incidents
              </span>
              <span className="text-[20px] font-bold font-mono text-[var(--critical)] block mt-1 tabular-nums">
                {openIncidentsCount}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            Deterministic circuit breaker trips awaiting operator review or resolution.
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-3.5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] cursor-help transition-colors hover:border-[var(--border-strong)]">
              <span className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider block">
                Paused Runs
              </span>
              <span className="text-[20px] font-bold font-mono text-[var(--warning)] block mt-1 tabular-nums">
                {pausedRunsCount}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            Agent runs suspended by the deterministic circuit breaker to prevent runaway loops or budget burn.
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-3.5 rounded-[var(--radius-panel)] border border-[var(--border)] bg-[var(--surface-1)] cursor-help transition-colors hover:border-[var(--border-strong)]">
              <span className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider block">
                Spend at pause (7d)
              </span>
              <span className="text-[20px] font-bold font-mono text-[var(--text)] block mt-1 tabular-nums">
                ${spendAtPause7d.toFixed(2)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent sideOffset={6}>
            Total USD token spend recorded on flagged runs at the moment execution was halted.
          </TooltipContent>
        </Tooltip>
      </div>

      {/* FIRST RUN EMPTY STATE: Flips to Fleet table when first event arrives over SSE */}
      {fleet.length === 0 ? (
        <div className="p-8 sm:p-10 border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] text-center max-w-2xl mx-auto space-y-6">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
              <Server className="w-6 h-6" strokeWidth={1.5} />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-[16px] font-bold text-[var(--text)] tracking-tight">
              Waiting for first event
            </h2>
            <p className="text-[13px] text-[var(--muted)] max-w-md mx-auto">
              No agents have reported telemetry yet. Connect an agent with the 3-line safety gate
              to begin real-time protection.
            </p>
          </div>

          {/* Live waiting indicator that flips over SSE */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[12px] font-mono text-[var(--text)]">
            <StatusDot status="ok" pulse />
            <span>Listening for inbound agent telemetry over SSE...</span>
          </div>

          {/* Verified 3-line snippet with key placeholder */}
          <div className="text-left space-y-2">
            <span className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider block">
              In-Process Safety Gate Snippet:
            </span>
            <CodeBlock code={setupSnippet} language="python" />
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="primary" onClick={handleCopySetupPrompt}>
              {copiedPrompt ? (
                <Check className="w-4 h-4 mr-1.5 text-[var(--ok)]" strokeWidth={1.5} />
              ) : (
                <Copy className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              )}
              {copiedPrompt ? "Copied Prompt" : "Copy Setup Prompt"}
            </Button>
          </div>
        </div>
      ) : (
        /* DENSE FLEET TABLE */
        <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                <TableHead className="w-56">Agent</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-32">Protection</TableHead>
                <TableHead className="w-36">Framework</TableHead>
                <TableHead className="w-48">Current Run</TableHead>
                <TableHead className="w-40">Last Event</TableHead>
                <TableHead className="text-right">Spend this run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleet.map((agent) => {
                const isFlashing = Boolean(flashingAgents[agent.agent_id]);
                const framework = agent.framework || "LangGraph";
                const spend = typeof agent.total_cost === "number" ? agent.total_cost : 0;
                const lastEventTime = agent.end_time || agent.start_time;

                const statusLower = agent.status.toLowerCase();
                const isRunning = ["running", "resuming", "resume_requested"].includes(statusLower);
                const isPaused = ["paused", "pause_requested"].includes(statusLower);
                const isFailed = statusLower === "failed";

                const statusVariant = isRunning
                  ? "ok"
                  : isPaused
                  ? "warning"
                  : isFailed
                  ? "critical"
                  : "neutral";

                const protection = (agent.protection_mode || "ACTIVE").toUpperCase();

                return (
                  <TableRow
                    key={agent.agent_id}
                    className={cn(
                      "transition-colors",
                      isFlashing && "row-sse-flash"
                    )}
                  >
                    {/* 1. Agent in mono */}
                    <TableCell className="font-mono font-medium text-[var(--text)]">
                      {agent.agent_id}
                    </TableCell>

                    {/* 2. Status (dot and text) */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <StatusDot status={statusVariant} pulse={isRunning} />
                        <span className="capitalize">{agent.status}</span>
                      </div>
                    </TableCell>

                    {/* 3. Protection */}
                    <TableCell>
                      <Badge
                        variant={
                          protection === "ACTIVE"
                            ? "ok"
                            : protection === "DEGRADED"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {protection}
                      </Badge>
                    </TableCell>

                    {/* 4. Framework */}
                    <TableCell className="font-mono text-[12px] text-[var(--muted)]">
                      {framework}
                    </TableCell>

                    {/* 5. Current Run (mono link) */}
                    <TableCell className="font-mono text-[12px]">
                      <Link
                        to={`/runs/${agent.run_id}`}
                        className="text-[var(--info)] hover:underline inline-flex items-center gap-1"
                        title={agent.run_id}
                      >
                        {agent.run_id.slice(0, 8)}...
                      </Link>
                    </TableCell>

                    {/* 6. Last Event (relative) */}
                    <TableCell className="font-mono text-[12px] text-[var(--muted)]">
                      {lastEventTime ? (
                        <span title={lastEventTime}>{relativeTime(lastEventTime)}</span>
                      ) : (
                        "n/a"
                      )}
                    </TableCell>

                    {/* 7. Spend this run */}
                    <TableCell className="text-right font-mono text-[12px] text-[var(--text)] tabular-nums">
                      {typeof spend === "number" ? `$${spend.toFixed(4)}` : "$0.0000"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
