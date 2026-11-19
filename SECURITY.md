# Security Policy

## Supported Versions

CortexHeal provides active security updates and vulnerability patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

The CortexHeal team takes the security of autonomous agent fleets seriously. If you discover a security vulnerability or bypass in CortexHeal's circuit breaker or token firewall:

1. **Do not create a public GitHub issue.**
2. Send an email with technical details, proof-of-concept code, and steps to reproduce to **`security@cortexheal.dev`** or **`team@cortexheal.dev`**.
3. We will acknowledge receipt of your vulnerability report within **48 hours**.
4. We will coordinate a fix and release a patched version alongside an advisory credit prior to public disclosure.

---

## Security Architecture Guarantees

- **Zero PII Transmission**: CortexHeal hashes tool arguments using salted, deterministic SHA-256 canonicalization. Raw enterprise PII never exits your host process unless you explicitly enable full payload debugging.
- **Fail-Open Ingestion**: Any network interruption or database backpressure in CortexHeal immediately drops telemetry events to prevent agent application deadlocks.
- **Multi-Tenant Isolation**: API tokens and dashboard sessions use Argon2id cryptographic hashing with strict tenant isolation enforced at the database query level.
