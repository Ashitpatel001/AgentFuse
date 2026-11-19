# Security Policy

## Supported Versions

AgentFuse provides active security updates and vulnerability patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability or bypass in AgentFuse's circuit breaker or token firewall:

1. **Do not create a public GitHub issue.**
2. Send an email with technical details and proof-of-concept code to **`security@agentfuse.dev`** or **`team@agentfuse.dev`**.
3. We will acknowledge receipt within **48 hours**.
4. We will coordinate a patch release prior to public disclosure.

---

## Security Guarantees

- **Zero PII Transmission**: AgentFuse hashes tool arguments using salted, deterministic SHA-256 canonicalization. Raw enterprise PII never exits your host process unless you explicitly configure full payload capture.
- **Fail-Open Ingestion**: Any network interruption or database backpressure in AgentFuse drops telemetry events immediately to prevent application deadlocks.
- **Multi-Tenant Isolation**: API tokens and dashboard sessions use Argon2id cryptographic hashing with strict tenant isolation enforced at the database query level.
