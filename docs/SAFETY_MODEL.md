# Safety Model

## Intervention Tiers (V1)

1.  **PAUSE**
    *   Safely suspends the agent's execution without destroying state.
    *   Trigger: Fires automatically when the deterministic detection engine trips a circuit breaker (stuck loop, budget exceeded).
    *   Reversibility: Fully reversible via RESUME.

2.  **RESUME**
    *   Controlled continuation of a paused run after human review.
    *   Trigger: Explicit operator approval (Approve) or rejection (Reject) of the proposed recovery plan via the dashboard or API.

These are the only two intervention actions in V1. The dashboard exposes exactly two controls per incident: **Approve** and **Reject**.

## Deferred to V2 (requires explicit decision before implementation)

- **KILL (destructive termination):** A third intervention tier that permanently terminates an agent run. Deferred because: (a) it's irreversible, (b) the dashboard's two-action design was a deliberate restraint decision, and (c) the product's pitch is that it never takes an unreviewed destructive action. Building KILL requires a separate design review for the safety implications.
- **Approval-expiry auto-termination:** Automatically killing a run when a human doesn't respond within a timeout. Deferred because "auto-terminate a customer's agent because nobody clicked a button" contradicts the product's human-in-the-loop guarantee. If implemented, the timeout behavior needs explicit customer opt-in, not a default.

## Core Safety Principles

*   **Fail-Safe Behavior:** If the CortexHeal engine is unavailable or errors out, the SDK adapter defaults to **PAUSE**. Never silently continue a potentially unsafe execution.
*   **Zero LLMs in Decision Path:** All safety decisions (pause, circuit-break) are made by deterministic rules (SHA-256 hash matching, exact threshold math). No LLM evaluator in the loop.
*   **Policy Evaluation:** Policies are evaluated synchronously on critical events (before tool execution) to prevent out-of-band runaway.
*   **Audit Requirements:** Every intervention (PAUSE, RESUME) is logged to PostgreSQL with an immutable `idempotency_key`, timestamp, and actor identity.
*   **Duplicate-Event Protection:** Idempotency keys prevent replay attacks or network retries from triggering multiple interventions for the same event.
*   **Tenant Isolation:** All detection, incidents, and recovery are scoped to the authenticated organization. Cross-tenant data access is blocked at every handler.
