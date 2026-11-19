import { useState, useEffect } from "react";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Pause, 
  Play, 
  RotateCcw, 
  TrendingUp, 
  Clock, 
  Cpu, 
  Flame, 
  Zap, 
  Eye, 
  SlidersHorizontal 
} from "lucide-react";

type Scenario = "healthy" | "stuck_loop" | "budget_exceeded";

export function LiveMonitoringPreview() {
  const [scenario, setScenario] = useState<Scenario>("stuck_loop");
  const [isRecovered, setIsRecovered] = useState(false);
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((prev) => prev + 1);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const handleScenarioChange = (s: Scenario) => {
    setScenario(s);
    setIsRecovered(false);
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Chrome / top window bar */}
      <div className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-xs font-mono text-slate-400 pl-2 border-l border-slate-800">
            agentfuse-watchdog // live telemetry inspector
          </span>
        </div>

        {/* Interactive Scenario Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="text-[11px] font-mono text-slate-500 px-2 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Simulate:
          </span>
          <button
            onClick={() => handleScenarioChange("healthy")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              scenario === "healthy"
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Nominal Fleet
          </button>
          <button
            onClick={() => handleScenarioChange("stuck_loop")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              scenario === "stuck_loop"
                ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Stuck Loop Trip
          </button>
          <button
            onClick={() => handleScenarioChange("budget_exceeded")}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              scenario === "budget_exceeded"
                ? "bg-red-500/30 text-red-300 border border-red-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Budget Ceiling
          </button>
        </div>
      </div>

      {/* Main Monitoring Deck */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Watchdog Status Banner (Datadog Watchdog style) */}
        {scenario === "healthy" && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <span>Fleet Watchdog Nominal</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 uppercase">
                    Zero Anomalies
                  </span>
                </div>
                <div className="text-xs text-emerald-400/80">
                  All 18 agents running within mathematical boundary envelope. Deterministic latency 24.8ms.
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-emerald-400">
              <span>p99 Latency: 28ms</span>
              <span>Tokens/sec: 840</span>
            </div>
          </div>
        )}

        {scenario === "stuck_loop" && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-700/60 flex flex-wrap items-center justify-between gap-4 animate-fade-in-site">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <span>CIRCUIT BREAKER ENGAGED: Stuck Loop Detected</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/80 text-amber-200 uppercase font-bold">
                    P0 Anomaly
                  </span>
                </div>
                <div className="text-xs text-amber-400/90 mt-0.5">
                  Agent <code className="text-amber-200 font-mono font-bold">support_resolver_04</code> repeated state hash <code className="text-amber-300 font-mono">0x9c4f8...</code> 4 consecutive times.
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5">
              {!isRecovered ? (
                <button
                  onClick={() => setIsRecovered(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Approve Deterministic Recovery Plan
                </button>
              ) : (
                <span className="px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Context Injected & Resumed Safely
                </span>
              )}
            </div>
          </div>
        )}

        {scenario === "budget_exceeded" && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-700/60 flex flex-wrap items-center justify-between gap-4 animate-fade-in-site">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-red-300 flex items-center gap-2">
                  <span>HARD CEILING EXCEEDED: Run Cost Limit Clamped</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900/80 text-red-200 uppercase font-bold">
                    Safety Gate Intercept
                  </span>
                </div>
                <div className="text-xs text-red-400/90 mt-0.5">
                  Agent <code className="text-red-200 font-mono font-bold">sql_analyst_09</code> hit $1.00 ceiling (spent $1.04). Execution suspended before compounding.
                </div>
              </div>
            </div>
            
            <div className="text-xs font-mono text-red-400 bg-red-950/80 border border-red-800/80 px-3 py-1.5 rounded-lg">
              Est. Saved: $428.50 in runaway tool looping
            </div>
          </div>
        )}

        {/* 4 Telemetry Metrics Grid (PostHog / Datadog style) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>Active Agent Tasks</span>
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
              <span>{scenario === "healthy" ? "24" : scenario === "stuck_loop" ? (isRecovered ? "24" : "23") : "23"}</span>
              <span className="text-xs text-emerald-400 font-mono font-normal">
                {isRecovered ? "+1 Resumed" : "in queue"}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 18 workers healthy
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>Watchdog Decision Latency</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
              <span>24.2 ms</span>
              <span className="text-xs text-blue-400 font-mono font-normal">p50</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1 font-mono">
              <span>Zero LLM hops</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>Circuit Breaker State</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {scenario === "healthy" ? (
                <span className="text-emerald-400">ARMED</span>
              ) : scenario === "stuck_loop" ? (
                isRecovered ? <span className="text-blue-400">RESTORED</span> : <span className="text-amber-400">TRIPPED</span>
              ) : (
                <span className="text-red-400">CLAMPED</span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-mono">
              {scenario === "healthy" ? "100% Deterministic" : "Halted at node boundary"}
            </div>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
              <span>Cumulative Cost Protected</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              ${(3420 + pulseTick * 0.15).toFixed(2)}
            </div>
            <div className="mt-2 text-[11px] text-emerald-400/90 font-mono">
              Saved across 92 incidents
            </div>
          </div>
        </div>

        {/* Live Agent Execution Queue Table & Trace Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Agent Queue Table (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Live Agent Queue & Task Pipeline
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Auto-refresh: 1s</span>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs">
              {[
                {
                  id: "support_resolver_04",
                  task: "Refund authorization & ledger reconciliation",
                  status: scenario === "stuck_loop" ? (isRecovered ? "resumed" : "paused") : "running",
                  framework: "LangGraph",
                  tokens: "18.4k",
                  cost: "$0.09",
                  stateHash: "0x9c4f82",
                },
                {
                  id: "sql_analyst_09",
                  task: "Recursive schema join generation",
                  status: scenario === "budget_exceeded" ? "paused" : "running",
                  framework: "CrewAI",
                  tokens: "214.1k",
                  cost: "$1.04",
                  stateHash: "0xa13bc9",
                },
                {
                  id: "code_reviewer_02",
                  task: "AST security vulnerability scanning",
                  status: "running",
                  framework: "AutoGen",
                  tokens: "32.1k",
                  cost: "$0.14",
                  stateHash: "0x77d01a",
                },
                {
                  id: "researcher_agent_11",
                  task: "Multi-document synthesis & citation",
                  status: "running",
                  framework: "LangGraph",
                  tokens: "44.9k",
                  cost: "$0.21",
                  stateHash: "0x53e4b2",
                },
              ].map((agent) => (
                <div key={agent.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200 truncate">
                        {agent.id}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                        {agent.framework}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] truncate mt-0.5">
                      {agent.task}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono text-[11px]">
                      <div className="text-slate-300">{agent.tokens} tok</div>
                      <div className="text-slate-500">{agent.cost}</div>
                    </div>

                    <div>
                      {agent.status === "running" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Play className="w-2.5 h-2.5 fill-current" /> Running
                        </span>
                      )}
                      {agent.status === "paused" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          <Pause className="w-2.5 h-2.5 fill-current" /> Paused
                        </span>
                      )}
                      {agent.status === "resumed" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          <RotateCcw className="w-2.5 h-2.5" /> Resumed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PostHog / Datadog style Trace & Deterministic Verifier (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-400" /> Deterministic Audit Trail
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                100% Verifiable
              </span>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="text-slate-500 text-[10px]">STEP 04 · SAFETY GATE CHECK</div>
                <div className="text-slate-300 flex items-center justify-between">
                  <span>State SHA-256 Hash:</span>
                  <span className="text-blue-400">9c4f828a3...</span>
                </div>
                <div className="text-slate-300 flex items-center justify-between">
                  <span>Match Count in Window:</span>
                  <span className={scenario === "stuck_loop" ? "text-amber-400 font-bold" : "text-emerald-400"}>
                    {scenario === "stuck_loop" ? "4 (Threshold ≥ 4)" : "1 (Normal)"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="text-slate-500 text-[10px]">RECOVERY ACTION SUGGESTION</div>
                <div className="text-slate-300 text-xs">
                  {scenario === "stuck_loop" ? (
                    <span className="text-amber-300">
                      <code>MODIFY_CONTEXT</code>: Inject prompt guideline: "Prior tool call returned empty set; break loop and return fallback."
                    </span>
                  ) : scenario === "budget_exceeded" ? (
                    <span className="text-red-300">
                      <code>KEEP_PAUSED</code>: Hard cost limit reached ($1.00). Requires operator manual override.
                    </span>
                  ) : (
                    <span className="text-emerald-400">
                      Zero recovery actions required. System healthy.
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[10px] text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Detection Engine:</span>
                  <span className="text-slate-200">agentfuse.detection.stuck_loop</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage Engine:</span>
                  <span className="text-slate-200">PostgreSQL 15 (Raw Psycopg2)</span>
                </div>
                <div className="flex justify-between">
                  <span>Telemetry Bus:</span>
                  <span className="text-slate-200">Redis Pub/Sub SSE Stream</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
