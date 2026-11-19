# Contributing to AgentFuse

Thank you for your interest in contributing to **AgentFuse: The 24ms Circuit Breaker for Autonomous AI Agents**!

AgentFuse is built to solve one of the most critical failure modes in autonomous agent production fleets: runaway tool loops and token budget overruns.

---

## 1. Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report concerns to `team@agentfuse.dev`.

---

## 2. Getting Started & Development Setup

### Prerequisites
- **Python 3.9+** (Python 3.11 recommended)
- **Docker & Docker Compose** (for PostgreSQL 15 & Redis 7)
- **Node.js 20+** (for frontend console and marketing site)

### Clone & Environment Setup
```bash
git clone https://github.com/Ashitpatel001/Cortexheal.git agentfuse
cd agentfuse

# Create and activate Python virtual environment
python -m venv .venv
source .venv/bin/activate  # Or .\.venv\Scripts\Activate.ps1 on Windows

# Install in editable mode with development & adapter extras
pip install -e ".[dev,all]"
```

### Start Local Infrastructure
```bash
# Launch PostgreSQL 15 & Redis 7
docker compose up -d

# Initialize database schema
agentfuse init --no-docker

# Reseed database with realistic demo agent runs & incidents
python scripts/reseed_demo_data.py
```

### Start Web UIs
```bash
# Terminal 1: APM Safety Console (Port 5173)
cd frontend
npm install
npm run dev

# Terminal 2: Marketing & Docs Site (Port 3000)
cd site
npm install
npm run dev
```

---

## 3. Running Tests

```bash
# Run full automated test suite
pytest tests/ -v
```

Before submitting a Pull Request, verify:
1. All tests pass: `pytest tests/`
2. Both frontend applications build without errors:
   - `cd frontend && npm run build`
   - `cd site && npm run build`
