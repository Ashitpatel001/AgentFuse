# CortexHeal

<p align="center">
  <a href="https://github.com/Ashitpatel001/Cortexheal">
    <img src="https://img.shields.io/github/stars/Ashitpatel001/Cortexheal?style=for-the-badge&logo=github&color=6320ee&label=Stars" alt="GitHub Stars" />
  </a>
  <a href="https://pypi.org/project/cortexheal/">
    <img src="https://img.shields.io/pypi/v/cortexheal?style=for-the-badge&color=blue&logo=pypi&logoColor=white" alt="PyPI Version" />
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
  Stops runaway tool loops and budget overruns in <strong>≤ 24 milliseconds</strong> with mathematical SHA-256 state equality — zero LLM hallucinations in the safety path.
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> •
  <a href="#the-zero-code-gateway-demo-primary-hook">Zero-Code Gateway</a> •
  <a href="#model-context-protocol-mcp">MCP Integration</a> •
  <a href="#benchmarks">Benchmarks</a> •
  <a href="CONTRIBUTING.md">Contributing</a> •
  <a href="DEPLOYMENT.md">Bare-Metal Guide</a>
</p>

---

## The Zero-Code Gateway Demo (Primary Hook)

Connect your existing agents to CortexHeal in **30 seconds** with a single line change. Works with OpenAI SDK, LangChain, CrewAI, AutoGen, and custom agents:

```python
from openai import OpenAI

# 1-line change: point base_url to CortexHeal Gateway
client = OpenAI(
    base_url="http://localhost:8000/v1",  # Or https://api.cortexheal.dev/v1
    api_key="your-cortexheal-key",        # BYOK: Upstream bills directly
    default_headers={"X-Agent-ID": "reconciliation_agent"}
)

# Agent continues using OpenAI normally; CortexHeal intercepts runaway tool loops
# in <= 24ms and returns HTTP 429 BEFORE the request reaches the LLM provider!
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Execute database sync tasks..."}]
)
```

---

## Installation via PyPI

Install the core package:

```bash
pip install cortexheal
```

Install optional ecosystem adapters:

```bash
# LangGraph state suspension & interrupt support
pip install "cortexheal[langgraph]"

# AutoGen safety gate support
pip install "cortexheal[autogen]"

# Model Context Protocol (MCP) server support
pip install "cortexheal[mcp]"

# Install all adapters and integrations
pip install "cortexheal[all]"
```

---

## Why CortexHeal?

When an autonomous agent enters a recursive failure loop (e.g., repeatedly calling a tool with identical parameters), it can burn **$200 to $500 in tokens** within minutes and risk corrupting production data.

### Deterministic Safety vs. LLM-as-a-Judge

| Metric | LLM-as-a-Judge | CortexHeal Deterministic Breaker |
| :--- | :---: | :---: |
| **Trip Latency** | 800ms – 2,500ms | **≤ 24ms (p50)** |
| **Evaluation Cost** | 2x Token Burn | **$0.00 (Pure In-Memory Compute)** |
| **Reliability** | Probabilistic (May Hallucinate) | **100% Deterministic SHA-256 Hashing** |
| **Safety Queue Overhead** | Blocking HTTP Calls | **0.15ms Non-Blocking Queue Push** |
| **Upstream Outage Impact** | Safety Engine Fails | **Completely Independent & Resilient** |

---

## Integration Modes

### Mode 1: Zero-Code OpenAI Proxy Gateway
Point `base_url` to CortexHeal. All LLM tool calls and prompt hashes pass through our sliding window detector. On the 4th identical repetition, the circuit trips immediately.

### Mode 2: In-Process LangGraph State Suspension (`interrupt()`)
For deep graph workflows, attach the native safety gate to physically suspend execution without cold-restarting worker processes:

```python
from cortexheal import CortexHeal
from cortexheal.adapters.langgraph import LangGraphAdapter
from langgraph.graph import StateGraph

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

## Model Context Protocol (MCP)

CortexHeal provides a native MCP server for developers using **Claude Desktop**, **Cursor**, or **Windsurf**:

### Run via CLI
```bash
cortexheal mcp
```

### Claude Desktop Configuration (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "cortexheal": {
      "command": "cortexheal",
      "args": ["mcp"],
      "env": {
        "DATABASE_URL": "postgresql://cortexheal:cortexpassword@localhost:5433/cortexheal_db"
      }
    }
  }
}
```

Provides live MCP tools: `list_open_incidents`, `get_incident_details`, and `get_run_timeline`. See [docs/MCP_INTEGRATION.md](docs/MCP_INTEGRATION.md) for full setup instructions.

---

## Quickstart (60 Seconds with Docker)

### 1. Clone & Run with Docker Compose
```bash
git clone https://github.com/Ashitpatel001/Cortexheal.git
cd Cortexheal

# Start PostgreSQL 15 & Redis containers
docker compose up -d

# Seed database with realistic agent runs and incidents
python scripts/reseed_demo_data.py
```

### 2. Start the Control Plane API
```bash
python -m uvicorn cortexheal.server.api:app --host 0.0.0.0 --port 8000
```

### 3. Run Live Interactive Demo
```bash
python examples/demo_proxy_gateway.py
```

### 4. Access Web Interfaces
- **APM Telemetry Dashboard**: `http://localhost:5173` (Demo login: `admin@cortexheal.com` / `admin123`)
- **Marketing & Safety Overview**: `http://localhost:3000`

---

## Benchmarks & Scale Verification

Benchmarked against **55 concurrent in-process LangGraph agents** running with active persistent SSE streaming:

| Metric | Measured Value | Scope / Boundary |
| :--- | :---: | :--- |
| **Telemetry Queue Handover (p50)** | **0.15 ms** | Non-blocking thread push |
| **Full Pipeline Circuit-Break (p50)** | **≤ 24.0 ms** | Ingestion &rarr; Deduplication &rarr; Trip state |
| **Event Loss Under Load** | **0.0%** | Zero lost events under backpressure |
| **Upstream Token Cost on Trip** | **$0.00** | Request rejected before LLM provider invocation |

---

## Testing & Quality

```bash
# Run full automated test suite (141 tests)
pytest tests/ -q
```

---

## License & Community

- **License**: Distributed under the [Apache 2.0 License](LICENSE).
- **Contributing**: Read our [Contributing Guidelines](CONTRIBUTING.md).
- **Security**: For responsible vulnerability disclosure, refer to [SECURITY.md](SECURITY.md).
- **Changelog**: View release history in [CHANGELOG.md](CHANGELOG.md).
