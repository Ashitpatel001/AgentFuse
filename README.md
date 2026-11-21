# AgentFuse

<p align="center">
  <a href="https://github.com/Ashitpatel001/AgentFuse">
    <img src="https://img.shields.io/github/stars/Ashitpatel001/AgentFuse?style=for-the-badge&logo=github&color=F59E0B&label=Stars" alt="GitHub Stars" />
  </a>
  <a href="https://pypi.org/project/agentfuse/">
    <img src="https://img.shields.io/pypi/v/agentfuse?style=for-the-badge&color=blue&logo=pypi&logoColor=white" alt="PyPI Version" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge" alt="License: Apache 2.0" />
  </a>
  <a href="pyproject.toml">
    <img src="https://img.shields.io/badge/Python-3.9+-3776AB.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python Version" />
  </a>
  <a href="#benchmarks-and-performance">
    <img src="https://img.shields.io/badge/Safety_Path-Zero_LLMs_(Deterministic)-10B981.svg?style=for-the-badge" alt="Deterministic Engine" />
  </a>
  <a href="tests/">
    <img src="https://img.shields.io/badge/Tests-141_Passing-success.svg?style=for-the-badge" alt="Automated Tests" />
  </a>
</p>

<p align="center">
  <strong>The Reliability & Safety Platform for Autonomous AI Agents.</strong><br />
  Stop runaway tool loops, enforce strict budget firewalls, and self-heal stuck agent runs in real time.
</p>

<p align="center">
  <a href="#quick-start-60-seconds">Quick Start</a> •
  <a href="#zero-code-gateway-demo">Zero-Code Gateway</a> •
  <a href="#model-context-protocol-mcp">MCP Integration</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#deployment">Deployment</a> •
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## Table of Contents

- [Product Overview](#product-overview)
  - [The Problem](#the-problem)
  - [Why Existing Approaches Fail](#why-existing-approaches-fail)
  - [How AgentFuse Solves It](#how-agentfuse-solves-it)
  - [Target Audience](#target-audience)
- [Visual Product Showcase](#visual-product-showcase)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Quick Start (60 Seconds)](#quick-start-60-seconds)
  - [Prerequisites](#prerequisites)
  - [1. Clone and Launch Infrastructure](#1-clone-and-launch-infrastructure)
  - [2. Start the Control Plane Server](#2-start-the-control-plane-server)
  - [3. Run the Live Verification Demo](#3-run-the-live-verification-demo)
  - [4. Access Web Interfaces](#4-access-web-interfaces)
- [Usage Examples](#usage-examples)
  - [Zero-Code Gateway (OpenAI SDK Drop-in)](#zero-code-gateway-demo)
  - [LangGraph In-Process Safety Gate](#langgraph-state-suspension-interrupt)
  - [AutoGen Turn Circuit Breaker](#autogen-adapter-integration)
  - [Model Context Protocol (MCP)](#model-context-protocol-mcp)
  - [AgentFuse CLI Operations](#agentfuse-cli-reference)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [API Reference](#api-reference)
  - [Proxy Gateway Endpoint](#1-proxy-gateway-endpoint)
  - [Control Plane Endpoints](#2-control-plane-endpoints)
  - [Server-Sent Events (SSE) Stream](#3-server-sent-events-sse-stream)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
  - [Production Docker Compose](#production-docker-compose)
  - [Serverless Cloud Run (Free-Tier Production)](#serverless-gcp-cloud-run)
  - [Reverse Proxy Configuration (Caddy)](#reverse-proxy-caddy)
- [Security & Tenant Isolation](#security--tenant-isolation)
- [Benchmarks & Performance](#benchmarks-and-performance)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Community & Support](#community--support)

---

## Product Overview

### The Problem

Autonomous AI agents executing multi-step tool calls frequently enter **recursive failure loops**. When an agent encounters ambiguous tool outputs, API rate limits, or drifting execution contexts, it tends to retry identical actions repeatedly. 

In production environments, a single runaway agent can:
1. **Burn $200–$500 in LLM token costs** within minutes before developers notice.
2. **Exhaust downstream rate limits**, causing cascading outages across enterprise services.
3. **Corrupt production databases** by repeatedly executing side-effecting operations (e.g., duplicated invoices, spam notifications, or mutated records).

### Why Existing Approaches Fail

| Approach | Latency | Reliability | Cost | Flaw |
| :--- | :---: | :---: | :---: | :--- |
| **LLM-as-a-Judge** | 800ms – 2,500ms | Probabilistic | 2x Token Burn | Evaluator LLM hallucinates under stress; fails completely if provider has an outage. |
| **Hardcoded Loop Counters** | 0ms | Static & Fragile | $0.00 | Blind to argument hashes; cannot catch complex multi-tool alternating cycles (Tool A &rarr; Tool B &rarr; Tool A). |
| **Post-Hoc Tracing (OTel/APM)** | N/A (After Fact) | Passive | Monitoring Fee | Alerts engineers *after* the budget is already drained and data is corrupted. |

### How AgentFuse Solves It

**AgentFuse is an active, deterministic runtime safety firewall and circuit breaker for AI agents.**

- **Sub-5ms State Hashing:** Performs inline SHA-256 state hashing over prompts, messages, tool names, and invocation payloads.
- **$\le 24$ms Circuit Breaking:** Intercepts repeating state patterns and hard-trips an HTTP 429 breaker **before** the request reaches the upstream LLM provider. Zero tokens burned on tripped steps.
- **Physical Execution Pausing:** Integrates natively with graph runtimes (like LangGraph) using `interrupt()`, suspending agent state cleanly without process crashes.
- **Autonomous Recovery Engine:** Synthesizes deterministic diagnosis plans to modify context, downrank failing tools, and resume runs with human-in-the-loop oversight.

### Target Audience

- **AI Platform Teams:** Deploying fleet-wide guardrails across multi-agent workflows.
- **Enterprise Software Engineers:** Building production applications with LangGraph, CrewAI, AutoGen, or custom OpenAI SDK loops.
- **Security & Compliance Leaders:** Requiring immutable, tenant-isolated audit logs of agent operations and automated human verification workflows.

---

## Visual Product Showcase

AgentFuse bundles an enterprise **APM Telemetry & Safety Console** directly inside the distribution.

<p align="center">
  <img src="docs/images/image-dashboard.png" alt="AgentFuse APM Safety Console Dashboard" width="95%" />
</p>

### Console Capabilities:
- **Real-Time Incident Stream:** Live Server-Sent Events (SSE) feed tracking tripped loops, budget breaches, and tool failures.
- **Interactive Triage & Resolution:** Inspect state hashes, review failure evidence, and execute `Approve` / `Reject` recovery plans with one click.
- **Agent Fleet Observability:** Monitor active runs, cumulative execution costs, p50/p99 latency, and token distributions.
- **Tenant API Key Management:** Issue scoped, role-based keys (`VIEWER`, `OPERATOR`, `ADMIN`) hashed with Argon2id.

<p align="center">
  <img src="docs/images/image-control-plane.png" alt="AgentFuse Control Plane Architecture Overview" width="95%" />
</p>

---

## Key Features

### 1. Deterministic Circuit Breaker (Zero LLMs in the Safety Path)
Evaluates execution state through cryptographic hashing and sliding-window repetition counters. Because no LLM is used to evaluate the agent, the safety layer cannot hallucinate, has zero token cost, and executes in **$\le 24$ milliseconds**.

### 2. Zero-Code OpenAI-Compatible Proxy Gateway
Drop AgentFuse into any existing codebase by simply changing the `base_url`. Supports Bring-Your-Own-Key (BYOK), passing requests transparently to OpenAI or Anthropic while monitoring loops and enforcing hard budget ceilings behind the scenes.

### 3. Deep Framework Adapters
- **LangGraph Adapter:** Hooks into compiled `StateGraph` workflows, using native `interrupt()` mechanisms to pause execution graphs for review without cold restarts.
- **AutoGen Adapter:** Wraps multi-agent group chats and conversational speakers, intercepting runaway conversational turns before budget exhaustion.

### 4. Model Context Protocol (MCP) Server
Ships with a native stdio MCP server (`agentfuse mcp`). Coding assistants like **Claude Desktop**, **Cursor**, and **Windsurf** can query live incident data, run timelines, and circuit breaker metrics directly as native tools.

### 5. Multi-Tenant Enterprise Security & Audit Compliance
- **Two-Plane Authentication:** Dedicated API keys for autonomous workers + Argon2id session authentication for human operators.
- **Tenant Isolation:** Every read, write, and SSE event is scoped strictly to `org_id` with foreign-key constraints.
- **Audit Export:** Export complete incident histories, evidence hashes, and human review decisions to CSV and JSON formats with a single request.

---

## How It Works

```mermaid
flowchart TD
    Client["Client / Autonomous Agent\n(OpenAI SDK, LangGraph, AutoGen)"]
    Gateway["AgentFuse Gateway Proxy\n(/v1/chat/completions)"]
    Hasher["Deterministic State Hashing\n(SHA-256 over messages & tools)"]
    Detector{"Sliding Window Check\n(Repetitions >= Threshold?)"}
    Breaker["🛑 CIRCUIT TRIPPED (HTTP 429)\n• Upstream Call Aborted ($0 Cost)\n• Incident Logged to PostgreSQL\n• Alert Dispatched to SSE Bus"]
    Upstream["Upstream LLM Provider\n(OpenAI / Anthropic BYOK)"]
    Telemetry["Collector & Ingestion Pipeline"]
    Console["Dashboard Console & Alert Stream\n(React 19 SPA + Slack/PagerDuty)"]

    Client -->|1. Request Payload| Gateway
    Gateway -->|2. Extract State| Hasher
    Hasher -->|3. Evaluate Window| Detector
    Detector -->|Yes: Loop Detected| Breaker
    Detector -->|No: State Normal| Upstream
    Breaker -->|4a. Real-time Event| Telemetry
    Upstream -->|4b. Guarded Response| Client
    Upstream -->|Telemetry Data| Telemetry
    Telemetry -->|5. Multi-Tenant SSE Fan-Out| Console
```

---

## Architecture

The AgentFuse platform is organized into clean, decoupled layers designed for horizontal scalability and high-throughput ingestion:

```mermaid
graph TB
    subgraph ClientLayer ["1. Integration & SDK Layer"]
        A1["OpenAI SDK (BYOK)"]
        A2["LangGraph Adapter"]
        A3["AutoGen Adapter"]
        A4["MCP Client (Cursor / Claude)"]
    end

    subgraph ServerLayer ["2. Server & Control Plane (FastAPI + Uvicorn)"]
        B1["Reverse Proxy Gateway (/v1)"]
        B2["REST API Control Plane (/api)"]
        B3["Real-time SSE Fan-Out Bus"]
        B4["Static SPA File Server"]
    end

    subgraph CoreLayer ["3. Protection & Recovery Core"]
        C1["Detection Engine (Loop + Budget)"]
        C2["Protection Controller (Active / Monitor)"]
        C3["Recovery Engine (Deterministic + AI)"]
        C4["Trust Engine (Pattern Scoring)"]
    end

    subgraph PersistenceLayer ["4. Persistence & Cache Layer"]
        D1[("PostgreSQL 15 (Raw psycopg2 Pool + yoyo)")]
        D2[("Redis 7 (Pub/Sub SSE Broadcast)")]
    end

    ClientLayer --> ServerLayer
    ServerLayer --> CoreLayer
    CoreLayer --> PersistenceLayer
```

- **Gateway Layer (`agentfuse.server.gateway`):** Sub-5ms reverse proxy intercepting LLM completions, verifying API quotas, and evaluating state repetition.
- **Detection Engine (`agentfuse.detection`):** Cryptographic SHA-256 state hashing, cyclic pattern recognition, and hard token budget limiters.
- **Protection Controller (`agentfuse.protection`):** Enforces execution policies (`ACTIVE` blocking vs. `MONITOR_ONLY` observation).
- **Storage Layer (`agentfuse.storage`):** High-performance thread-safe connection pooling (`psycopg2.pool.ThreadedConnectionPool`) managed through plain-SQL migrations via `yoyo-migrations`.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Language** | Python 3.9 – 3.12 | Core backend, runtime SDK, and CLI engine |
| **API Framework** | FastAPI / Starlette | High-throughput asynchronous REST and SSE streaming |
| **ASGI Server** | Uvicorn | Production process management and HTTP/2 handling |
| **Database** | PostgreSQL 15+ | ACID audit log, tenant isolation, incidents, and relational state |
| **DB Driver** | `psycopg2-binary` (Raw Pool) | Zero-ORM direct execution for deterministic sub-millisecond query latency |
| **Migrations** | `yoyo-migrations` | Deterministic, immutable, plain-SQL schema migrations |
| **Caching / PubSub** | Redis 7+ (Optional) | Horizontal multi-replica SSE fan-out; falls back to in-process bus when omitted |
| **Frontend Console** | React 19, TypeScript, Tailwind 4, Vite 8 | Real-time APM operations console and incident triage interface |
| **Marketing Site** | React 19, Tailwind 4, Lucide React | Public landing page with live interactive circuit breaker playground |
| **Protocols** | OpenAI API, Model Context Protocol (MCP), SSE | Drop-in AI ecosystem interoperability |

---

## Quick Start (60 Seconds)

### Prerequisites

- **Python 3.9+**
- **Docker & Docker Compose** (for local PostgreSQL & Redis)
- **Git**

---

### 1. Clone and Launch Infrastructure

```bash
# Clone the repository
git clone https://github.com/Ashitpatel001/AgentFuse.git
cd AgentFuse

# Create and activate Python virtual environment
python -m venv .venv

# Linux / macOS:
source .venv/bin/activate

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# Install AgentFuse in editable mode with all extras
pip install -e ".[all,dev]"

# Start PostgreSQL 15 & Redis 7 containers in the background
docker compose up -d
```

### 2. Start the Control Plane Server

```bash
# Initialize database schema and run baseline migrations
agentfuse init --skip-docker

# Start the AgentFuse Control Plane API & Dashboard server
agentfuse start --port 8000
```

### 3. Run the Live Verification Demo

In a separate terminal window, execute the automated proxy gateway demonstration:

```bash
python examples/demo_proxy_gateway.py
```

*What happens:* The demo simulates an agent entering a repeating invoice reconciliation loop. On the **4th repetition**, AgentFuse mathematically trips in **$\le 24$ms**, returning an HTTP 429 response without calling external LLMs.

### 4. Access Web Interfaces

- **Real-Time APM Safety Console:** [`http://localhost:8000`](http://localhost:8000)
  - *Default Credentials:* `admin@agentfuse.com` / `admin123`
- **Interactive Documentation:** [`http://localhost:8000/docs`](http://localhost:8000/docs)
- **Health Check:** [`http://localhost:8000/health`](http://localhost:8000/health)
- **Prometheus Metrics:** [`http://localhost:8000/metrics`](http://localhost:8000/metrics)

---

## Usage Examples

### Zero-Code Gateway Demo

Point your existing OpenAI SDK client to AgentFuse. No prompt restructuring or framework changes required:

```python
from openai import OpenAI

# Point base_url to AgentFuse — bills your standard OpenAI account directly
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="sk-your-real-openai-key",
    default_headers={
        "X-Agent-ID": "payroll_auditor_agent",
        "X-Max-Budget": "2.50"  # Enforce $2.50 hard run limit
    }
)

# Standard OpenAI completions execution
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Reconcile unallocated bank deposits..."}]
)

# AgentFuse passes response normally, attaching safety verification metadata:
print("Safety Status:", response.agentfuse["status"])  # "PASSED_CIRCUIT_BREAKER"
print("Decision Latency:", response.agentfuse["decision_latency_ms"], "ms")
```

---

### LangGraph State Suspension (`interrupt()`)

For complex graph-based agents, attach the AgentFuse safety gate node to freeze execution graphs cleanly when an incident occurs:

```python
from agentfuse import AgentFuse
from agentfuse.adapters.langgraph import LangGraphAdapter
from langgraph.graph import StateGraph

# Initialize adapter with unique agent identifier
adapter = LangGraphAdapter(agent_id="customer_support_agent")
fuse = AgentFuse(adapter=adapter)

# Build LangGraph DAG
builder = StateGraph(dict)
builder.add_node("safety_gate", fuse.safety_gate)
builder.add_node("agent_worker", worker_function)

# Wire safety gate at graph entrance
builder.set_entry_point("safety_gate")
builder.add_edge("safety_gate", "agent_worker")
builder.add_edge("agent_worker", "safety_gate")

graph = builder.compile()
```

---

### AutoGen Adapter Integration

Wrap conversational group chats to prevent runaway ping-pong loops between autonomous agents:

```python
from agentfuse.adapters.autogen import AutoGenAdapter

adapter = AutoGenAdapter(agent_id="code_review_fleet", max_consecutive_turns=6)

# Evaluates conversational state before each speaker turn
is_safe, reason = adapter.check_turn(speaker="Coder", message="Running test suite again...")
if not is_safe:
    print(f"AgentFuse Circuit Breaker Engaged: {reason}")
    # Halt conversational loop
```

---

### Model Context Protocol (MCP)

AgentFuse exposes native tools over stdio for AI assistants like **Claude Desktop**, **Cursor**, and **Windsurf**.

#### Add to Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "agentfuse": {
      "command": "agentfuse",
      "args": ["mcp"],
      "env": {
        "DATABASE_URL": "postgresql://agentfuse:agentfusepassword@localhost:5433/agentfuse_db"
      }
    }
  }
}
```

#### Exposed MCP Tools:
- `list_open_incidents`: Returns open safety incidents across all registered agent runs.
- `get_incident_details`: Retrieves cryptographic evidence hashes and trigger descriptions.
- `get_run_timeline`: Inspects the step-by-step telemetry timeline of an agent run.

---

### AgentFuse CLI Reference

The package includes a comprehensive command-line interface:

```bash
# Setup environment, check database, and apply migrations
agentfuse init

# Start production API & dashboard server
agentfuse start --port 8000 --workers 4

# Run live stuck-loop and budget-overrun demonstration
agentfuse demo

# Check health and database readiness
agentfuse status

# Provision a new tenant organization and admin user
agentfuse create-org --org-name "Acme Corp" --email "admin@acme.com"

# Purge raw telemetry events older than 90 days (ADR-004 compliance)
agentfuse retention --days 90

# Start stdio Model Context Protocol (MCP) server
agentfuse mcp
```

---

## Configuration & Environment Variables

AgentFuse enforces strict production secrets hygiene. All variables can be configured via a `.env` file or container environment variables:

| Variable | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `DATABASE_URL` | `string` | *(Required)* | PostgreSQL connection URI (`postgresql://user:pass@host:5432/db`) |
| `REDIS_URL` | `string` | `""` | Redis connection URI for multi-replica SSE fan-out (e.g. `redis://localhost:6379/0`) |
| `ENVIRONMENT` | `string` | `development` | Runtime environment (`development`, `testing`, `production`) |
| `ADMIN_TOKENS` | `string` | `dev-admin-key` | Comma-delimited admin API tokens for key provisioning & tenant setup |
| `OPERATOR_TOKENS` | `string` | `dev-operator-key`| Tokens allowed to approve/reject recovery plans and resume paused runs |
| `VIEWER_TOKENS` | `string` | `dev-viewer-key` | Read-only tokens for dashboards and telemetry streams |
| `DB_POOL_MIN` | `integer`| `2` | Minimum persistent PostgreSQL pool connections |
| `DB_POOL_SIZE` | `integer`| `10` | Base PostgreSQL connection pool size |
| `DB_MAX_OVERFLOW`| `integer`| `20` | Maximum surge connections permitted under heavy traffic |
| `AGENTFUSE_HOST` | `string` | `0.0.0.0` | Host interface to bind server |
| `AGENTFUSE_PORT` | `integer`| `8000` | Port for incoming HTTP/SSE traffic |
| `AGENTFUSE_WORKERS`| `integer`| `4` | Number of worker processes |
| `RETENTION_DAYS` | `integer`| `90` | Number of days to retain raw events before automated purge |

> [!IMPORTANT]
> When `ENVIRONMENT=production` is set, AgentFuse automatically rejects default development tokens (`dev-admin-key`, `dev-operator-key`, etc.) and default database passwords at startup.

---

## API Reference

### 1. Proxy Gateway Endpoint

#### `POST /v1/chat/completions`
OpenAI-compatible proxy gateway with inline deterministic loop detection and budget tracking.

- **Headers:**
  - `Authorization: Bearer <openai_key>` *(BYOK)*
  - `X-Agent-ID: <string>` *(Optional, defaults to `openai-proxy-agent`)*
  - `X-Run-ID: <string>` *(Optional, auto-generated if omitted)*
  - `X-Max-Budget: <float>` *(Optional hard cost ceiling, e.g. `1.00`)*
- **Response (Normal Execution):** `200 OK` (Standard OpenAI JSON response + `agentfuse` safety metadata).
- **Response (Circuit Tripped):** `429 Too Many Requests`
  ```json
  {
    "error": {
      "message": "AgentFuse Circuit Breaker Engaged: Repeated identical prompt state detected (4 consecutive calls). Upstream LLM call blocked to save budget.",
      "type": "agentfuse_circuit_breaker",
      "code": "STUCK_LOOP_TRIPPED",
      "incident_id": "9780bb1a-6763-4509-a13d-999af27656ae",
      "state_hash": "a1b2c3d4e5f6...",
      "repetition_count": 4,
      "suggested_action": "MODIFY_CONTEXT: Inject fallback prompt or break tool cycle."
    }
  }
  ```

---

### 2. Control Plane Endpoints

| Method | Endpoint | Auth Level | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | Public | System liveness probe |
| `GET` | `/readiness` | Public | Database connection readiness verification |
| `GET` | `/metrics` | Public | Standard Prometheus scrape endpoint |
| `GET` | `/api/incidents` | `VIEWER` | Paginated incident list for caller's organization |
| `GET` | `/api/incidents/{id}/plan` | `VIEWER` | Retrieve or generate deterministic recovery plan |
| `POST`| `/api/incidents/{id}/plan/approve` | `OPERATOR` | Approve proposed recovery action and execute resume |
| `POST`| `/api/incidents/{id}/plan/reject` | `OPERATOR` | Reject recovery action |
| `GET` | `/api/runs` | `VIEWER` | List agent runs, framework types, and statuses |
| `GET` | `/api/runs/{id}/timeline` | `VIEWER` | Full chronological event & audit timeline for a run |
| `POST`| `/api/runs/{id}/resume` | `OPERATOR` | Request physical resume of a paused agent run |
| `POST`| `/api/keys` | `ADMIN` | Provision a new scoped API key |
| `GET` | `/api/audit/export` | `OPERATOR` | Export compliance audit history (`?format=csv` or `?format=json`) |

---

### 3. Server-Sent Events (SSE) Stream

#### `GET /api/stream`
Connects a real-time event listener scoped strictly to the authenticated organization.

- **Query Parameters:** `run_id` *(Optional: filter stream to a single agent run)*
- **Supported Event Types:**
  - `run_status_changed`: Emitted when run lifecycle transitions (`running` &rarr; `paused` &rarr; `completed`).
  - `incident_created`: Emitted immediately when a circuit breaker trips.
  - `plan_approved` / `plan_rejected`: Real-time human triage action dispatch.
  - `heartbeat`: Keep-alive ping emitted every 5 seconds.

---

## Project Structure

```text
AgentFuse/
├── agentfuse/                   # Core Python package
│   ├── adapters/                # Framework integrations (LangGraph, AutoGen)
│   ├── alerting/                # Webhook dispatchers (Slack, PagerDuty)
│   ├── cli/                     # Click-powered command line interface
│   ├── detection/               # SHA-256 state hashing & sliding-window loop detectors
│   ├── learning/                # Trust scoring & failure pattern fingerprinting
│   ├── models/                  # Pydantic data schemas (Events, Runs, Incidents)
│   ├── protection/              # Runtime safety controller & enforcement policies
│   ├── recovery/                # Deterministic diagnosis & automated plan synthesis
│   ├── runtime/                 # Ingestion pipeline & event collection workers
│   ├── server/                  # FastAPI control plane, gateway proxy & SSE bus
│   │   └── static/              # Embedded production React console bundles
│   └── storage/                 # PostgreSQL pool manager & yoyo migrations
├── deploy/                      # Production deployment configurations (Caddyfile)
├── docs/                        # Architecture decision records & API contracts
├── examples/                    # Runnable demonstrations & manual integration scripts
├── frontend/                    # Source code for React 19 APM Operations Console
├── migrations/                  # Idempotent plain-SQL migrations (0001 baseline)
├── scripts/                     # Seed utilities, cron demo runners, and backups
├── site/                        # Source code for marketing landing page
├── tests/                       # Automated test suite (Unit, E2E, Load, Adversarial)
├── docker-compose.yml           # Local dev infrastructure (PostgreSQL 15 + Redis 7)
├── docker-compose.prod.yml      # Production stack configuration
├── Dockerfile                   # Multi-stage production container definition
├── pyproject.toml               # Package build specifications and dependencies
└── README.md                    # Project documentation
```

---

## Deployment

### Production Docker Compose

Run the entire self-hosted stack—including the API server, PostgreSQL database, Redis instance, and pre-compiled frontend console—with a single command:

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

### Serverless GCP Cloud Run

AgentFuse is packaged to run within **Google Cloud Run's Always Free tier** ($0.00/month idle cost) when paired with a free serverless PostgreSQL provider (such as [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com)):

```bash
# 1. Build and push container to Google Artifact Registry
gcloud builds submit --tag gcr.io/<PROJECT_ID>/agentfuse:latest .

# 2. Deploy to Cloud Run
gcloud run deploy agentfuse \
  --image gcr.io/<PROJECT_ID>/agentfuse:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --set-env-vars "ENVIRONMENT=production" \
  --set-env-vars "DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/agentfuse_prod?sslmode=require" \
  --set-env-vars "ADMIN_TOKENS=af-live-prod-$(openssl rand -hex 16)"
```

---

### Reverse Proxy (Caddy)

A production-ready [`deploy/Caddyfile`](deploy/Caddyfile) is included in the repository. It automatically manages free Let's Encrypt TLS certificates and proxies both HTTP/2 and unbuffered SSE streams:

```caddyfile
api.yourdomain.com {
    reverse_proxy 127.0.0.1:8000 {
        # Keep SSE streaming unbuffered
        flush_interval -1
    }
}
```

---

## Security & Tenant Isolation

1. **Cryptographic Secret Storage:** API keys and human user credentials are never stored in plaintext. Passwords are hashed using **Argon2id** (`argon2-cffi`). API keys store only SHA-256 digests and display a 4-character prefix for identification.
2. **Strict Foreign-Key Tenant Boundaries:** Every database query joins through `org_id`. It is mathematically impossible for an authenticated token from Org A to read runs or receive SSE events belonging to Org B.
3. **Session Revocability:** Dashboard sessions use server-side opaque 256-bit tokens delivered via `HttpOnly`, `Secure`, `SameSite=Lax` cookies, allowing immediate session termination without JWT invalidation issues.
4. **Vulnerability Reporting:** For responsible security disclosures, please review our [Security Policy](SECURITY.md) or email `security@agentfuse.dev`.

---

## Benchmarks and Performance

Empirical benchmarks measured across **55 concurrent in-process LangGraph agent workers** under active persistent SSE streaming:

| Metric | Measured Value | Architecture Layer |
| :--- | :---: | :--- |
| **Telemetry Ingestion Handover (p50)** | **0.15 ms** | Non-blocking thread pool queue |
| **Inline Prompt State Hashing (p50)** | **0.82 ms** | Deterministic SHA-256 cryptographic digest |
| **Full Circuit-Break Pipeline (p50)** | **$\le$ 24.0 ms** | Ingestion &rarr; Deduplication &rarr; Tripped HTTP 429 |
| **Event Loss Under Extreme Load** | **0.0%** | Zero lost events under backpressure |
| **Upstream Token Waste on Trip** | **$0.00** | Execution halted prior to LLM provider dispatch |

---

## Roadmap

- [x] **v0.1.0 (Core Engine):**
  - [x] Zero-Code OpenAI-compatible proxy gateway with BYOK support.
  - [x] Deterministic stuck-loop and budget-ceiling detectors.
  - [x] Native LangGraph `interrupt()` and AutoGen conversation adapters.
  - [x] Multi-tenant PostgreSQL persistence with `yoyo-migrations`.
  - [x] Real-time SSE fan-out bus with optional Redis pub/sub scaling.
  - [x] Embedded React 19 APM Operations Console.
  - [x] Model Context Protocol (MCP) server for Claude Desktop and Cursor.
  - [x] Outbound Slack, PagerDuty, and Opsgenie webhook alerting.
- [ ] **v0.2.0 (Planned):**
  - [ ] Time-partitioned PostgreSQL storage for 100M+ event retention.
  - [ ] Native CrewAI callback telemetry handler.
  - [ ] Semantic tool drift clustering using local lightweight embeddings.
  - [ ] OpenTelemetry (OTel) span exporter.
- [ ] **v0.3.0 (Enterprise):**
  - [ ] SAML 2.0 / Okta SSO authentication.
  - [ ] Role-based audit export compliance sign-off workflows.

---

## Contributing

We welcome contributions from the open-source community!

1. Fork the repository on GitHub: [`https://github.com/Ashitpatel001/AgentFuse`](https://github.com/Ashitpatel001/AgentFuse)
2. Create your feature branch: `git checkout -b feat/my-new-feature`
3. Install development dependencies: `pip install -e ".[dev,all]"`
4. Run the automated test suite:
   ```bash
   pytest tests/ -q
   ```
5. Commit your changes following Conventional Commits (`feat: add support for X`).
6. Push to your branch and open a Pull Request.

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting code.

---

## License

AgentFuse is open-source software licensed under the **[Apache License, Version 2.0](LICENSE)**.

---

## Community & Support

- **GitHub Issues:** [Bug Reports & Feature Requests](https://github.com/Ashitpatel001/AgentFuse/issues)
- **Discussions:** [Architecture Feedback & Ideas](https://github.com/Ashitpatel001/AgentFuse/discussions)
- **Documentation:** Explore comprehensive guides in [`docs/`](docs/)

---

<p align="center">
  <strong>Build fearless, production-grade autonomous agent systems.</strong><br />
  If you find AgentFuse useful, consider starring the repository on GitHub! ⭐
</p>
