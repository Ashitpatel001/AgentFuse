import pytest
from fastapi.testclient import TestClient
from agentfuse.server.api import app

client = TestClient(app)

def test_gateway_chat_completion_normal():
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "user", "content": "Calculate the projected EBITDA for Q3."}
        ]
    }
    headers = {
        "X-Agent-ID": "test-financial-analyst",
        "X-Run-ID": "run-test-gw-01"
    }
    resp = client.post("/v1/chat/completions", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "choices" in data
    assert "agentfuse" in data
    assert data["agentfuse"]["status"] == "PASSED_CIRCUIT_BREAKER"


def test_gateway_stuck_loop_circuit_breaker():
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "user", "content": "Exact repeated failing query to database."}
        ]
    }
    headers = {
        "X-Agent-ID": "test-looping-agent",
        "X-Run-ID": "run-test-loop-99"
    }
    
    # 3 repetitions pass
    for _ in range(3):
        r = client.post("/v1/chat/completions", json=payload, headers=headers)
        assert r.status_code == 200

    # 4th repetition trips the circuit breaker
    r_tripped = client.post("/v1/chat/completions", json=payload, headers=headers)
    assert r_tripped.status_code == 429
    err = r_tripped.json()["error"]
    assert err["code"] == "STUCK_LOOP_TRIPPED"
    assert "Circuit Breaker Engaged" in err["message"]
    assert "suggested_action" in err
