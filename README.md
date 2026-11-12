# CortexHeal

<p align="center">
  <a href="https://github.com/Ashitpatel001/Cortexheal">
    <img src="https://img.shields.io/github/stars/Ashitpatel001/Cortexheal?style=for-the-badge&logo=github&color=6320ee&label=Stars" alt="GitHub Stars" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="License" />
  </a>
  <a href="pyproject.toml">
    <img src="https://img.shields.io/badge/Python-3.9+-3776AB.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python Version" />
  </a>
  <a href="#benchmarks">
    <img src="https://img.shields.io/badge/Safety_Path-Zero_LLMs_(Deterministic)-10B981.svg?style=for-the-badge" alt="Deterministic" />
  </a>
  <a href="tests/">
    <img src="https://img.shields.io/badge/Tests-141_Passed-success.svg?style=for-the-badge" alt="Tests Status" />
  </a>
</p>

<p align="center">
  <strong>The Automated Circuit Breaker & Safety Firewall for Autonomous AI Agents.</strong><br />
  Stops runaway tool loops and budget spikes in <strong>≤ 24 milliseconds</strong> with mathematical SHA-256 state equality — zero LLM hallucinations in the safety path.
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> •
  <a href="#dual-integration-modes">Integration Modes</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#benchmarks">Benchmarks</a> •
  <a href="DEPLOYMENT.md">Bare-Metal Guide</a>
</p>

---

## Why CortexHeal?

Every time an autonomous agent gets stuck in a tool loop (e.g., repeatedly querying a malformed API or scanning empty partitions with identical arguments), it burns **$200 to $500 in tokens** in minutes and risks corrupting production databases.

### The Deterministic Imperative (Zero LLMs in the Safety Loop)
Most observability tools attempt to solve agent safety by introducing a secondary **"LLM-as-a-Judge"**. This introduces three critical flaws:
1. **Compounding Latency**: Calling an LLM at every step adds 500ms–2,500ms of latency per tool call.
2. **Probabilistic Rulings**: An LLM judge can hallucinate, flip verdicts across identical states, or be jailbroken by the agent's context.
3. **Cascading Failure**: When the upstream LLM provider suffers an outage, the safety system fails simultaneously.

**CortexHeal uses 100% deterministic evaluation**:
- **O(1) SHA-256 Canonical Fingerprinting**: Tool arguments and normalized outputs are hashed and tracked in in-memory ring buffers.
- **Mathematical Threshold Bounds**: Strict token usage, cost accumulation, and repetition limits trip instantly without model inference.
- **Sub-Millisecond Queue Handover**: 0.15ms non-blocking queue push prevents blocking agent execution threads.
- **100% Free & Open-Source**: Apache 2.0 licensed, zero token markups, zero vendor lock-in.

---

## Dual Integration Modes

CortexHeal supports two integration models depending on your fleet architecture:

### Mode 1: Zero-Code OpenAI Proxy Gateway (30-Second Onboarding)
Point `base_url` to CortexHeal. Works out of the box with LangChain, CrewAI, AutoGen, or raw OpenAI/Anthropic SDKs. Uses your own API keys (**BYOK**).

```python
from openai import OpenAI

# Drop-in: Point base_url to CortexHeal Circuit Breaker
client = OpenAI(
    base_url="http://localhost:8000/v1",  # CortexHeal Gateway
    api_key="sk-your-openai-key",          # Your own OpenAI key (BYOK)
    default_headers={"X-Agent-ID": "finance_reconciliation_agent"}
)

# If this agent repeats identical prompts/tool calls (N >= 4),
# CortexHeal trips in ≤ 24ms and returns HTTP 429 BEFORE calling OpenAI!
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Reconcile ledger credits..."}]
)
```

### Mode 2: In-Process LangGraph State Suspension (`interrupt()`)
Physically pause graph execution inside LangGraph's DAG and resume state safely without cold restarting containers.

```python
from cortexheal import CortexHeal
from cortexheal.adapters.langgraph import LangGraphAdapter
from langgraph.graph import StateGraph

# 1. Initialize adapter and attach SafetyGate
adapter = LangGraphAdapter(agent_id="customer_support_agent")
cortex  = CortexHeal(adapter=adapter)

builder = StateGraph(AgentState)
builder.add_node("safety_gate", cortex.safety_gate)
builder.add_node("agent_worker", worker_node)

builder.set_entry_point("safety_gate")
builder.add_edge("safety_gate", "agent_worker")
builder.add_edge("agent_worker", "safety_gate")
graph = builder.compile()
```

---

## Quickstart (60 Seconds with Docker)

### 1. Clone & Run with Docker Compose
```bash
git clone https://github.com/Ashitpatel001/Cortexheal.git
cd Cortexheal

# Start PostgreSQL 15 & Redis containers
docker compose up -d

# Reseed database with realistic demo runs, incidents & user accounts
python scripts/reseed_demo_data.py
```

### 2. Start the Control Plane Server
```bash
# Start FastAPI Control Plane & Proxy Gateway on port 8000
python -m uvicorn cortexheal.server.api:app --host 0.0.0.0 --port 8000
```

### 3. Test the Circuit Breaker Live
Run our built-in zero-code proxy demo:
```bash
python examples/demo_proxy_gateway.py
```
Observe calls 1–3 pass normally in $\le 11$ms, and call 4 instantly trips with **`HTTP 429 STUCK_LOOP_TRIPPED`**, saving upstream tokens and dispatching an incident to the dashboard.

### 4. Launch Web Interfaces
- **Datadog-Grade APM Dashboard**: `http://localhost:5173` (or `http://localhost:8000`)
  - Login with quick-fill `admin@cortexheal.com / admin123` or click **"View Live Public Demo"**.
- **White Marketing Site**: `http://localhost:3001`
  - Interactive live circuit breaker terminal and runaway loss ROI calculator.

---

## Architecture

```mermaid
flowchart TD
    subgraph Agent Runtime [Agent Execution Plane - Customer VPC]
        A[Agent Task / StateGraph] --> B[SafetyGate / Gateway Node]
        B --> C[Agent Tool / LLM Call]
        C -->|BYOK Telemetry| D[LangGraph / OpenAI Proxy]
    end

    subgraph CortexHeal Control Plane [Control Plane]
        D -->|0.15ms Non-Blocking Queue| E[RuntimeCollector]
        E --> F[Deterministic Hash Detection]
        F -->|STUCK_LOOP / BUDGET_EXCEEDED| G[Protection Controller]
        G -->|Status: pause_requested| H[(PostgreSQL 15)]
        G -->|Outbound Webhooks| I[Alert Dispatcher]
    end

    subgraph Operations & Observability [Datadog Watchdog Console]
        H -->|HTTP 429 / interrupt()| B
        I -->|Slack Block Kit / PagerDuty| J[On-Call SRE Team]
        H -->|Live SSE Stream| K[APM Incident Queue]
        K -->|Human-in-the-Loop Approval| L[Recovery Engine]
    end
```

---

## Benchmarks & Scale Verification

Tested with **55 concurrent in-process LangGraph agents** running simultaneously against **55 persistent SSE streams**:

| Metric | Measured Value | Scope / Boundary |
| :--- | :---: | :--- |
| **Telemetry Queue Handover (p50)** | **0.15 ms** | Agent thread non-blocking queue push |
| **Telemetry Queue Handover (p95)** | **0.34 ms** | Agent thread non-blocking queue push |
| **Full Pipeline Circuit-Break (p50)** | **~24.0 ms** | Ingest &rarr; Postgres &rarr; Detector hash &rarr; Pause update |
| **Full Pipeline Circuit-Break (p95)** | **~94.0 ms** | 55-agent simultaneous burst under load |
| **Event Loss Rate** | **0.0%** | Zero dropped events across all concurrent runs |
| **Upstream LLM Token Cost on Trip** | **$0.00** | Request rejected before calling OpenAI/Anthropic |

---

## Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Control Plane API** | Python 3.11, FastAPI, Pydantic v2, Uvicorn, HTTPX |
| **Database & Cache** | PostgreSQL 15 (`ThreadedConnectionPool`), Redis 7 |
| **APM Dashboard** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, TanStack Query |
| **Marketing Site** | React 19, Tailwind CSS v4, Datadog-inspired clean white palette |
| **Testing** | Pytest, Pytest-Asyncio (141 passed tests) |

---

## Testing

```bash
# Run full automated test suite (141 tests)
pytest tests/ -q

# Run proxy gateway demo
python examples/demo_proxy_gateway.py

# Run LangGraph recoverable loop demo
python examples/manual_recoverable_loop.py
```

---

## License

Distributed under the **Apache 2.0 License**. See [`LICENSE`](LICENSE) for details. Built with ❤️ for the open-source autonomous AI community.
