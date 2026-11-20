# AgentFuse Test Agents

These are local, mocked LangGraph agents designed to test AgentFuse's Detection and Recovery engines deterministically without requiring external API calls or real LLM executions.

## Running the tests & demos

Ensure the AgentFuse database and API server are running first.

1. **Test 0 - Zero-Code Proxy Gateway Demo**
   ```bash
   python examples/demo_proxy_gateway.py
   ```
   Demonstrates routing LLM calls through `POST /v1/chat/completions`. Normal calls pass in ≤ 11ms, and identical repetitive tool loops trip the circuit breaker on the 4th repetition with HTTP 429 before upstream LLM tokens are burned.

2. **Test A - Recoverable Loop (LangGraph)**
   ```bash
   python examples/manual_recoverable_loop.py
   ```
   This agent triggers a STUCK_LOOP, gets paused by AgentFuse, gets resumed via the API, and then successfully transitions its state to SUCCESS to prove recovery behavior.

3. **Test B - Unrecoverable Loop (LangGraph)**
   ```bash
   python examples/manual_unrecoverable_loop.py
   ```
   This agent triggers a STUCK_LOOP, gets paused, gets resumed, but intentionally continues its failing loop to trigger AgentFuse's RECOVERY_REPEATED_FAILURE safeguard.
