import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { LoadingState, ErrorState, Badge } from "../components/ui";
import { relativeTime, cn } from "../utils";
import { Activity, ShieldAlert, FileText } from "lucide-react";

export function RunDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: run, isLoading: runLoading, error: runError } = useQuery({
    queryKey: ["run", id],
    queryFn: () => api.getRun(id!),
    enabled: !!id,
  });

  const { data: timeline, isLoading: timelineLoading, error: timelineError } = useQuery({
    queryKey: ["timeline", id],
    queryFn: () => api.getRunTimeline(id!),
    enabled: !!id,
  });

  if (runLoading || timelineLoading) return <LoadingState message="Loading run details..." />;
  if (runError) return <ErrorState title="Failed to load run" error={runError} />;
  if (timelineError) return <ErrorState title="Failed to load timeline" error={timelineError} />;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-text-muted font-mono">
        <Link to="/runs" className="hover:text-text-secondary transition-colors">
          runs
        </Link>
        <span className="text-text-muted/30">/</span>
        <span className="text-text-secondary">{id}</span>
      </div>

      {/* Run header */}
      <div className="bg-bg-raised border border-border-subtle rounded-xl p-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight mb-1">{run?.agent_id}</h1>
          <div className="text-[12px] font-mono text-text-muted mb-4">{run?.run_id}</div>
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.12em] text-text-muted font-semibold">Framework</span>
              <span className="text-[13px] text-text-secondary capitalize mt-0.5">{run?.framework}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.12em] text-text-muted font-semibold">Protection</span>
              <span className="text-[13px] text-text-secondary mt-0.5">{run?.protection_mode}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.12em] text-text-muted font-semibold">Started</span>
              <span className="text-[13px] text-text-secondary mt-0.5" title={run?.start_time}>
                {run?.start_time ? relativeTime(run.start_time) : "—"}
              </span>
            </div>
          </div>
        </div>
        <Badge
          variant={
            run?.status === "running" ? "green"
              : run?.status === "failed" ? "red"
              : run?.status === "completed" ? "neutral"
              : "amber"
          }
          dot
        >
          {run?.status?.toUpperCase()}
        </Badge>
      </div>

      {/* Timeline */}
      <div>
        <h3 className="text-[15px] font-semibold text-text-primary mb-4">Execution Timeline</h3>
        <div className="border-l-2 border-border-subtle ml-4 space-y-6 py-2">
          {timeline?.map((entry, idx) => {
            const isEvent = entry.type === "event";
            const isIncident = entry.type === "incident";
            const isAudit = entry.type === "audit";

            return (
              <div key={idx} className="relative pl-8" style={{ animationDelay: `${idx * 40}ms` }}>
                <div
                  className={cn(
                    "absolute -left-[11px] p-1 rounded-full border-2 border-bg-base",
                    isEvent ? "bg-bg-overlay text-text-tertiary"
                      : isIncident ? "bg-red-500 text-white"
                      : "bg-accent text-white"
                  )}
                >
                  {isEvent && <Activity className="w-3.5 h-3.5" />}
                  {isIncident && <ShieldAlert className="w-3.5 h-3.5" />}
                  {isAudit && <FileText className="w-3.5 h-3.5" />}
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
                    {isEvent && String(entry.data.event_type)}
                    {isIncident && "SAFETY INCIDENT DETECTED"}
                    {isAudit && String(entry.data.action)}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted" title={entry.timestamp}>
                    {relativeTime(entry.timestamp)}
                  </span>
                </div>

                <div className="bg-bg-base border border-border-subtle rounded-xl p-3 text-[13px]">
                  {isEvent && (
                    <div className="font-mono text-text-tertiary text-[12px]">
                      Seq: {String(entry.data.sequence_number)} · Tool: {String(entry.data.tool) || "N/A"}
                    </div>
                  )}
                  {isIncident && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="red" dot>{String(entry.data.failure_type)}</Badge>
                        <span className="font-mono text-[11px] text-text-muted">
                          {String(entry.data.incident_id).substring(0, 8)}
                        </span>
                      </div>
                      <Link
                        to={`/incidents/${String(entry.data.incident_id)}`}
                        className="text-accent hover:text-accent-hover text-[12px] font-medium transition-colors inline-block"
                      >
                        View Incident Details →
                      </Link>
                    </div>
                  )}
                  {isAudit && (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            String(entry.data.result) === "SUCCESS" ? "green"
                              : String(entry.data.result) === "FAILED" ? "red"
                              : "neutral"
                          }
                        >
                          {String(entry.data.result)}
                        </Badge>
                        <span className="text-text-tertiary text-[12px]">
                          by {String(entry.data.actor_id) || String(entry.data.actor_type)}
                        </span>
                      </div>
                      {String(entry.data.reason) && (
                        <p className="text-text-secondary mt-1 text-[12px]">{String(entry.data.reason)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {timeline?.length === 0 && (
            <div className="pl-8 text-text-muted italic text-[13px]">No timeline entries found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
