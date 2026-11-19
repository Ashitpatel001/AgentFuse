# Contributing to CortexHeal

Thank you for your interest in contributing to **CortexHeal: The Deterministic Circuit Breaker & Safety Firewall for Autonomous AI Agents**! 

CortexHeal is built to solve one of the most pressing challenges in autonomous agent production fleets: runaway tool loops, token overruns, and cascading state corruptions. We welcome contributions from developers, researchers, and systems engineers worldwide.

---

## 1. Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to `team@cortexheal.dev`.

---

## 2. Getting Started & Development Setup

### Prerequisites
- **Python 3.9+** (Python 3.11 recommended)
- **Docker & Docker Compose** (for PostgreSQL 15 & Redis 7)
- **Node.js 20+** (for frontend and marketing site)
- **Git**

### Clone & Environment Setup
```bash
git clone https://github.com/Ashitpatel001/Cortexheal.git
cd Cortexheal

# Create and activate Python virtual environment
python -m venv .venv
# Linux / macOS:
source .venv/bin/activate
# Windows:
.\.venv\Scripts\Activate.ps1

# Install in editable mode with development & adapter extras
pip install -e ".[dev,all]"
```

### Start Local Infrastructure
```bash
# Launch PostgreSQL 15 & Redis 7
docker compose up -d

# Initialize and apply database migrations
cortexheal init --no-docker

# Reseed database with realistic demo agent runs & incidents
python scripts/reseed_demo_data.py
```

### Start the Backend Server
```bash
uvicorn cortexheal.server.api:app --host 0.0.0.0 --port 8000 --reload
```

### Start Web UIs
```bash
# Terminal 1: APM Dashboard (Port 5173)
cd frontend
npm install
npm run dev

# Terminal 2: Marketing Site (Port 3000)
cd site
npm install
npm run dev
```

---

## 3. Running Tests

We maintain high automated test coverage across unit, adversarial, E2E, and concurrency suites:

```bash
# Run the complete test suite
pytest tests/ -v

# Run targeted adversarial stuck-loop tests
pytest tests/adversarial/ -v

# Run zero-code proxy gateway tests
pytest tests/test_gateway.py -v
```

Before submitting a Pull Request, ensure:
1. All existing and new tests pass: `pytest tests/`
2. Both frontend applications build without TypeScript errors:
   - `cd frontend && npm run build`
   - `cd site && npm run build`

---

## 4. Development Guidelines

### Deterministic Safety Principle
CortexHeal's core value proposition is **deterministic safety** ($O(1)$ SHA-256 canonical hashing, mathematical cost limits, non-blocking $0.15$ms ingestion queues). 
- **DO NOT** introduce LLM calls, probabilistic heuristics, or network latency into the real-time circuit-breaker evaluation path.
- Ingestion must remain **fail-open**: an outage in CortexHeal must never block or crash the host agent.

### Git & Pull Request Workflow
1. Fork the repository and create a feature branch (`git checkout -b feat/your-feature-name`).
2. Make atomic, well-tested commits using conventional commit syntax:
   - `feat(...)`: New feature or adapter
   - `fix(...)`: Bug fix
   - `perf(...)`: Performance optimization
   - `docs(...)`: Documentation updates
3. Open a Pull Request against `main`. Include a description of the problem, the solution, and verification steps.

---

## 5. Reporting Issues & Vulnerabilities

- For feature requests and bug reports: Open a [GitHub Issue](https://github.com/Ashitpatel001/Cortexheal/issues).
- For security vulnerabilities: Follow our [Security Policy](SECURITY.md) and email `security@cortexheal.dev`.
