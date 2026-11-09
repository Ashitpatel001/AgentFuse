import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Clock, Shield, DollarSign, Zap } from "lucide-react";
import { cn } from "../utils";

function Tile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Shield;
  accent?: "blue" | "red" | "green" | "amber";
}) {
  const accentColors = {
    blue: "text-blue-400",
    red: "text-red-400",
    green: "text-emerald-400",
    amber: "text-amber-400",
  };
  const iconBg = {
    blue: "bg-blue-500/10",
    red: "bg-red-500/10",
    green: "bg-emerald-500/10",
    amber: "bg-amber-500/10",
  };

  return (
    <div className="bg-bg-raised border border-border-subtle rounded-xl px-4 py-4 hover:border-border-default transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
          {label}
        </div>
        <div className={cn("p-1.5 rounded-lg", accent ? iconBg[accent] : "bg-bg-overlay")}>
          <Icon className={cn("w-3.5 h-3.5", accent ? accentColors[accent] : "text-text-muted")} />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary font-mono tabular-nums tracking-tight leading-none">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-text-muted mt-2 font-mono">{sub}</div>
      )}
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="bg-bg-raised border border-border-subtle rounded-xl px-4 py-4 space-y-3">
      <div className="flex justify-between">
        <div className="skeleton h-2.5 w-20" />
        <div className="skeleton h-7 w-7 rounded-lg" />
      </div>
      <div className="skeleton h-7 w-14" />
      <div className="skeleton h-2.5 w-24" />
    </div>
  );
}

export function MetricsBar() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["metrics_summary"],
    queryFn: () => api.getMetrics(),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </div>
    );
  }

  if (isError || !data) return null;

  const ttd = data.time_to_detection_ms;
  const detection =
    ttd.count > 0 && ttd.p50 != null
      ? `p50 ${Math.round(ttd.p50)}ms · p95 ${ttd.p95 != null ? Math.round(ttd.p95) : "—"}ms`
      : "no incidents yet";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile
        label="Runs monitored"
        value={String(data.runs_monitored)}
        icon={Shield}
        accent="blue"
      />
      <Tile
        label="Incidents detected"
        value={String(data.incidents_detected)}
        sub={`${data.runs_flagged} runs flagged`}
        icon={Zap}
        accent="red"
      />
      <Tile
        label="Spend on flagged"
        value={`$${data.cost_on_flagged_runs_usd.toFixed(2)}`}
        sub="runaway spend caught"
        icon={DollarSign}
        accent="green"
      />
      <Tile
        label="Detection latency"
        value={ttd.count > 0 && ttd.p50 != null ? `${Math.round(ttd.p50)}ms` : "—"}
        sub={detection}
        icon={Clock}
        accent="amber"
      />
    </div>
  );
}
