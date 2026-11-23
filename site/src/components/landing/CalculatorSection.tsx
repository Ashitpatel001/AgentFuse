import { useState } from "react";

export default function CalculatorSection() {
  const [agentCount, setAgentCount] = useState(8);
  const [costPerTurn, setCostPerTurn] = useState(0.06);
  const [loopsWithoutBreaker, setLoopsWithoutBreaker] = useState(65);
  const [incidentsPerMonth, setIncidentsPerMonth] = useState(12);

  const loopsWithBreaker = 4;
  const unhaltedCostPerIncident = costPerTurn * loopsWithoutBreaker;
  const haltedCostPerIncident = costPerTurn * loopsWithBreaker;
  const monthlyExposureUnhalted = unhaltedCostPerIncident * incidentsPerMonth;
  const monthlyExposureHalted = haltedCostPerIncident * incidentsPerMonth;
  const exposureDelta = monthlyExposureUnhalted - monthlyExposureHalted;

  return (
    <section className="max-w-6xl mx-auto px-6 pt-12 border-t border-[var(--border)]">
      <div className="max-w-3xl space-y-3 mb-8">
        <span className="font-mono text-[12px] font-bold text-[var(--brand)] uppercase tracking-wider block">
          04
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">
          Know what a runaway costs
        </h2>
        <p className="text-[14px] text-[var(--muted)] leading-relaxed">
          Financial exposure calculation based on empirical agent repeat scenarios. Adjust parameters
          to model your fleet exposure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Inputs */}
        <div className="md:col-span-6 border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] p-5 space-y-4">
          <span className="font-mono text-[11px] text-[var(--muted)] uppercase tracking-wider block font-semibold">
            Fleet parameters (editable)
          </span>

          <div className="space-y-3 text-[12px] font-mono">
            <div>
              <label htmlFor="calc-active-agents" className="text-[var(--muted)] block mb-1">
                Active agents in fleet
              </label>
              <input
                id="calc-active-agents"
                aria-label="Active agents in fleet"
                type="number"
                min="1"
                max="500"
                value={agentCount}
                onChange={(e) => setAgentCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
              />
            </div>

            <div>
              <label htmlFor="calc-cost-per-turn" className="text-[var(--muted)] block mb-1">
                Estimated cost per tool turn ($)
              </label>
              <input
                id="calc-cost-per-turn"
                aria-label="Estimated cost per tool turn in dollars"
                type="number"
                step="0.01"
                min="0.01"
                max="5"
                value={costPerTurn}
                onChange={(e) => setCostPerTurn(Math.max(0.001, parseFloat(e.target.value) || 0.01))}
                className="w-full p-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
              />
            </div>

            <div>
              <label htmlFor="calc-loop-iterations" className="text-[var(--muted)] block mb-1">
                Loop iterations before manual detection (without breaker)
              </label>
              <input
                id="calc-loop-iterations"
                aria-label="Loop iterations before manual detection without breaker"
                type="number"
                min="5"
                max="300"
                value={loopsWithoutBreaker}
                onChange={(e) => setLoopsWithoutBreaker(Math.max(5, parseInt(e.target.value) || 5))}
                className="w-full p-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
              />
            </div>

            <div>
              <label htmlFor="calc-incident-rate" className="text-[var(--muted)] block mb-1">
                Incident rate per month
              </label>
              <input
                id="calc-incident-rate"
                aria-label="Incident rate per month"
                type="number"
                min="1"
                max="100"
                value={incidentsPerMonth}
                onChange={(e) => setIncidentsPerMonth(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)]"
              />
            </div>
          </div>
        </div>

        {/* Results Display */}
        <div className="md:col-span-6 border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface-1)] p-5 space-y-4 font-mono">
          <span className="text-[11px] text-[var(--muted)] uppercase tracking-wider block font-semibold">
            Exposure comparison
          </span>

          <div className="p-4 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
            <span className="text-[11px] text-[var(--muted)] block">Exposure without circuit breaker</span>
            <span className="text-[24px] font-bold text-[var(--critical)] block tabular-nums">
              ${monthlyExposureUnhalted.toFixed(2)}
            </span>
            <span className="text-[11px] text-[var(--muted)] block">
              {incidentsPerMonth} incidents × {loopsWithoutBreaker} iterations @ ${costPerTurn.toFixed(3)}
            </span>
          </div>

          <div className="p-4 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
            <span className="text-[11px] text-[var(--muted)] block">
              Spend at pause with AgentFuse (stopped at 4 iterations)
            </span>
            <span className="text-[24px] font-bold text-[var(--ok)] block tabular-nums">
              ${monthlyExposureHalted.toFixed(2)}
            </span>
            <span className="text-[11px] text-[var(--muted)] block">
              {incidentsPerMonth} incidents × 4 iterations @ ${costPerTurn.toFixed(3)}
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[13px]">
            <span className="text-[var(--text)] font-semibold">Exposure reduction</span>
            <span className="text-[var(--ok)] font-bold tabular-nums">
              ${exposureDelta.toFixed(2)} / mo
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
