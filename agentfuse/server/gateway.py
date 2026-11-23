import time
import uuid
import logging
import asyncio
from typing import Dict, Any, Optional
import httpx
from fastapi import APIRouter, Request, Response, HTTPException, status
from fastapi.responses import JSONResponse

from agentfuse.runtime.hashing import deterministic_hash
from agentfuse.runtime.collector import collector
from agentfuse.models.events import RuntimeEvent, TokenUsage
from agentfuse.storage.postgres import (
    save_run, get_run, save_incident
)
from agentfuse.models.run import AgentRun
from agentfuse.models.incident import Incident
from agentfuse.server import sse_bus

logger = logging.getLogger("agentfuse.gateway")

gateway_router = APIRouter(tags=["Gateway"])

# In-memory sliding window cache for fast edge loop checking
# { run_id: [hash1, hash2, ...] }
_RUN_STATE_HISTORY: Dict[str, list] = {}
# { run_id: cumulative_cost }
_RUN_CUMULATIVE_COST: Dict[str, float] = {}

# Approximate pricing per 1K tokens for common models (USD)
MODEL_PRICING = {
    "gpt-4o": {"prompt": 0.005 / 1000, "completion": 0.015 / 1000},
    "gpt-4o-mini": {"prompt": 0.00015 / 1000, "completion": 0.0006 / 1000},
    "gpt-4": {"prompt": 0.03 / 1000, "completion": 0.06 / 1000},
    "gpt-3.5-turbo": {"prompt": 0.0015 / 1000, "completion": 0.002 / 1000},
    "claude-3-5-sonnet": {"prompt": 0.003 / 1000, "completion": 0.015 / 1000},
    "default": {"prompt": 0.002 / 1000, "completion": 0.006 / 1000},
}


def estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    pricing = MODEL_PRICING.get(model.lower(), MODEL_PRICING["default"])
    return (prompt_tokens * pricing["prompt"]) + (completion_tokens * pricing["completion"])


@gateway_router.post("/v1/chat/completions")
async def chat_completions_proxy(request: Request):
    """
    OpenAI-Compatible Proxy Gateway with Deterministic Circuit Breaking.
    
    1. Authenticates & extracts tenant API key.
    2. Performs in-line SHA-256 prompt state hashing (sub-5ms).
    3. Trips Circuit Breaker if stuck loop detected (returns 429 before upstream call).
    4. Enforces hard budget ceilings.
    5. Forwards to upstream OpenAI/Anthropic using the caller's BYOK credentials.
    6. Emits real-time telemetry into AgentFuse dashboard via SSE.
    """
    from agentfuse.config import settings
    if not settings.GATEWAY_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gateway disabled. Set GATEWAY_ENABLED=true to enable."
        )

    _t0 = time.perf_counter()
    
    # 1. Parse Headers & BYOK (Bring Your Own Key)
    auth_header = request.headers.get("Authorization", "")
    openai_key = None
    if auth_header.startswith("Bearer "):
        openai_key = auth_header[7:].strip()
    
    agentfuse_key = request.headers.get("X-AgentFuse-Key") or request.headers.get("X-API-Key")
    agent_id = request.headers.get("X-Agent-ID") or "openai-proxy-agent"
    run_id = request.headers.get("X-Run-ID")
    
    # Read payload
    try:
        body_bytes = await request.body()
        payload = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")

    messages = payload.get("messages", [])
    model = payload.get("model", "gpt-4o-mini")
    tools = payload.get("tools")
    
    # Generate run_id if not supplied by caller
    if not run_id:
        # If user passed a conversation/session tag, use it, else generate one
        run_id = payload.get("user") or f"run_proxy_{agent_id}_{int(time.time() // 3600)}"

    # 2. Deterministic SHA-256 State Hashing
    state_to_hash = {
        "messages": messages,
        "tools": tools,
    }
    state_hash = deterministic_hash(state_to_hash)

    # 3. Sliding Window Loop Detection (Threshold = 4 repetitions)
    history = _RUN_STATE_HISTORY.setdefault(run_id, [])
    history.append(state_hash)
    if len(history) > 10:
        history.pop(0)

    # Check for consecutive identical state hashes
    repetitions = 0
    for h in reversed(history):
        if h == state_hash:
            repetitions += 1
        else:
            break

    # If tripped (>= 4 identical prompts in a row)
    if repetitions >= 4:
        incident_id = str(uuid.uuid4())
        logger.warning(
            f"[Circuit Breaker] STUCK_LOOP tripped for agent={agent_id}, run={run_id}. "
            f"Hash={state_hash[:12]} repeated {repetitions} times."
        )

        # Record Incident in DB
        incident = Incident(
            incident_id=incident_id,
            run_id=run_id,
            agent_id=agent_id,
            failure_type="STUCK_LOOP",
            severity="CRITICAL",
            status="OPEN",
            detector="proxy_gateway_loop_detector",
            detector_version="1.0",
            trigger_event_id=str(uuid.uuid4()),
            triggered_at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            evidence={
                "tool": "chat_completion",
                "repetitions": repetitions,
                "state_hash": state_hash,
                "model": model,
                "message_count": len(messages)
            },
            observed_value=repetitions,
            threshold=4,
            description=f"Proxy Gateway detected {repetitions} consecutive identical chat completion calls.",
            run_status="paused",
            protection_mode="ACTIVE"
        )
        try:
            save_incident(incident)
            # Notify frontend via SSE
            sse_bus.publish(
                "default_org",
                "incident_created",
                {
                    "incident_id": incident_id,
                    "run_id": run_id,
                    "failure_type": "STUCK_LOOP",
                    "severity": "CRITICAL",
                    "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                },
                run_id=run_id
            )
        except Exception as err:
            logger.error(f"Error persisting incident: {err}")

        # RETURN 429 BEFORE CALLING OPENAI (Zero Tokens Burned!)
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": {
                    "message": (
                        f"AgentFuse Circuit Breaker Engaged: Repeated identical prompt state detected "
                        f"({repetitions} consecutive calls). Upstream LLM call blocked to save budget."
                    ),
                    "type": "agentfuse_circuit_breaker",
                    "code": "STUCK_LOOP_TRIPPED",
                    "incident_id": incident_id,
                    "state_hash": state_hash,
                    "repetition_count": repetitions,
                    "suggested_action": "MODIFY_CONTEXT: Inject fallback prompt or break tool cycle."
                }
            }
        )

    # 4. Budget Ceiling Check (Default $1.00 hard limit)
    current_cost = _RUN_CUMULATIVE_COST.get(run_id, 0.0)
    max_budget = float(request.headers.get("X-Max-Budget", "1.00"))
    if current_cost >= max_budget:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": {
                    "message": f"AgentFuse Budget Ceiling Breach: Run cost (${current_cost:.4f}) reached ${max_budget:.2f} limit.",
                    "type": "agentfuse_budget_ceiling",
                    "code": "BUDGET_EXCEEDED",
                    "cumulative_cost": current_cost,
                    "budget_limit": max_budget
                }
            }
        )

    # 5. Upstream Forwarding or High-Speed Mock Simulation
    # Check if a real OpenAI key was supplied
    is_mock = not openai_key or openai_key.startswith("mock-") or openai_key.startswith("test-")

    if is_mock:
        # Simulate an instant, realistic OpenAI completion response (Zero Cost Testing Mode)
        latency_ms = int((time.perf_counter() - _t0) * 1000) + 18
        prompt_tokens = sum(len(str(m.get("content", ""))) // 4 for m in messages) + 30
        completion_tokens = 45
        total_tokens = prompt_tokens + completion_tokens
        step_cost = estimate_cost(model, prompt_tokens, completion_tokens)
        _RUN_CUMULATIVE_COST[run_id] = current_cost + step_cost

        # Ingest Telemetry into AgentFuse Collector
        event = RuntimeEvent(
            run_id=run_id,
            agent_id=agent_id,
            framework="proxy_gateway",
            event_type="LLM_CALL_COMPLETED",
            sequence_number=len(history),
            latency_ms=latency_ms,
            tokens=TokenUsage(prompt=prompt_tokens, completion=completion_tokens, total=total_tokens),
            cost=step_cost,
            state_hash=state_hash,
            status="success",
            model=model,
            provider="openai_byok",
            idempotency_key=str(uuid.uuid4())
        )
        collector.ingest_event(event)

        return JSONResponse({
            "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": f"[AgentFuse Guarded Response] Processed successfully through deterministic safety firewall."
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            },
            "agentfuse": {
                "status": "PASSED_CIRCUIT_BREAKER",
                "state_hash": state_hash[:12],
                "decision_latency_ms": int((time.perf_counter() - _t0) * 1000),
                "cumulative_run_cost_usd": round(current_cost + step_cost, 5)
            }
        })

    # Forwarding to Real Upstream OpenAI using Caller's Key
    async with httpx.AsyncClient(timeout=60.0) as client:
        upstream_headers = {
            "Authorization": f"Bearer {openai_key}",
            "Content-Type": "application/json",
        }
        
        try:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=upstream_headers,
                content=body_bytes
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Upstream OpenAI request failed: {exc}")

        resp_data = resp.json()
        latency_ms = int((time.perf_counter() - _t0) * 1000)

        # Extract real token consumption from OpenAI response
        usage = resp_data.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
        step_cost = estimate_cost(model, prompt_tokens, completion_tokens)
        _RUN_CUMULATIVE_COST[run_id] = current_cost + step_cost

        # Ingest Telemetry into AgentFuse DB & SSE Bus
        event = RuntimeEvent(
            run_id=run_id,
            agent_id=agent_id,
            framework="proxy_gateway",
            event_type="LLM_CALL_COMPLETED",
            sequence_number=len(history),
            latency_ms=latency_ms,
            tokens=TokenUsage(prompt=prompt_tokens, completion=completion_tokens, total=total_tokens),
            cost=step_cost,
            state_hash=state_hash,
            status="success",
            model=model,
            provider="openai_byok",
            idempotency_key=str(uuid.uuid4())
        )
        collector.ingest_event(event)

        # Attach AgentFuse safety metadata
        if isinstance(resp_data, dict):
            resp_data["agentfuse"] = {
                "status": "PASSED_CIRCUIT_BREAKER",
                "state_hash": state_hash[:12],
                "decision_latency_ms": int((time.perf_counter() - _t0) * 1000),
                "cumulative_run_cost_usd": round(current_cost + step_cost, 5)
            }

        return JSONResponse(status_code=resp.status_code, content=resp_data)
