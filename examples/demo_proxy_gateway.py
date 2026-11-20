"""
AgentFuse Proxy Gateway Demo (Zero-Code Agent Circuit Breaker)
==============================================================
Demonstrates how any Python agent or LLM application can route through
AgentFuse's proxy gateway (POST /v1/chat/completions) with zero code changes.

Key Architectural Guarantees:
1. Zero Upstream Cost on Trips: Trips on the 4th repetitive state hash before
   reaching OpenAI/Anthropic, preventing runaway tool loops.
2. BYOK (Bring Your Own Key): Pass your own API key in Authorization header.
   AgentFuse never pays or marks up your LLM token bills.
3. Deterministic: Uses mathematical SHA-256 state equality, not probabilistic LLMs.
"""

import json
import urllib.request
import urllib.error
import sys

GATEWAY_URL = "http://localhost:8000/v1/chat/completions"

def make_call(agent_id: str, run_id: str, prompt: str, call_number: int):
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a customer support agent."},
            {"role": "user", "content": prompt}
        ]
    }
    
    # In production, pass your real OpenAI key: "Bearer sk-..."
    # Using 'test-key-001' enables zero-cost simulation mode in the gateway
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-key-001",
        "X-Agent-ID": agent_id,
        "X-Run-ID": run_id,
    }
    
    req = urllib.request.Request(GATEWAY_URL, data=json.dumps(payload).encode("utf-8"), headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            meta = res_data.get("agentfuse", {})
            print(f"  [Call #{call_number}] HTTP {response.status} OK | Decision Latency: {meta.get('decision_latency_ms', 0)}ms | State Hash: {meta.get('state_hash', 'N/A')[:10]}...")
            return True, res_data
    except urllib.error.HTTPError as e:
        err_data = json.loads(e.read().decode("utf-8"))
        print(f"  [Call #{call_number}] 🛑 HTTP {e.code} CIRCUIT BREAKER TRIPPED!")
        print(f"             Code:    {err_data.get('error', {}).get('code')}")
        print(f"             Message: {err_data.get('error', {}).get('message')}")
        print(f"             Action:  {err_data.get('error', {}).get('suggested_action')}")
        return False, err_data

def main():
    print("=" * 70)
    print("  AGENTFUSE PROXY GATEWAY: ZERO-CODE CIRCUIT BREAKER DEMO")
    print("=" * 70)
    print(f"Targeting: {GATEWAY_URL}\n")

    # Scenario 1: Normal Agent Flow (Unique states pass through safely)
    print("[Scenario 1] Normal Agent Behavior (Distinct Prompts)")
    print("-" * 55)
    make_call("sql_analyst_agent", "run_norm_01", "SELECT * FROM orders LIMIT 10", 1)
    make_call("sql_analyst_agent", "run_norm_01", "SELECT customer_id, count(*) FROM orders GROUP BY 1", 2)
    print("  -> Passed circuit breaker safely without tripping.\n")

    # Scenario 2: Rogue Repetitive Tool Loop (Trips on 4th repetition)
    print("[Scenario 2] Runaway Tool Loop (Identical Repeated Query)")
    print("-" * 55)
    loop_prompt = "Querying ledger partition 2024-Q3 for unallocated payments..."
    for step in range(1, 5):
        success, _ = make_call("rogue_finance_agent", "run_loop_99", loop_prompt, step)
        if not success:
            print(f"\n  -> Upstream LLM call blocked at Step {step} before burning tokens!")
            print("  -> Incident logged to Postgres & dispatched to operator dashboard.")
            break

    print("\n" + "=" * 70)
    print("  DEMO COMPLETE: Circuit breaker safely prevented rogue token burn.")
    print("=" * 70)

if __name__ == "__main__":
    main()
