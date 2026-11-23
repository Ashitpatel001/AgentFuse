import time
import uuid
import sys
from typing import TypedDict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from agentfuse import AgentFuse
from agentfuse.adapters.langgraph import LangGraphAdapter
from agentfuse.runtime.collector import collector
from agentfuse.models.events import RuntimeEvent

MAX_ITERATIONS = 20

class AgentState(TypedDict):
    input: str
    count: int
    output: str

def dummy_tool_node(state: AgentState):
    # This represents our repeating logic.
    count = state.get("count", 0)
    
    if count >= MAX_ITERATIONS:
        print(f"Agent reached MAX_ITERATIONS ({MAX_ITERATIONS}). Exiting safely.")
        return {"count": count, "output": "Done"}
        
    print(f"Executing dummy tool (Iteration {count})")
    
    # We must explicitly ingest a fake event so AgentFuse observes it, 
    # since we don't have a full LLM provider automatically hooked up here.
    # In a real setup, LangChain/LangGraph callbacks would do this.
    # We will simulate the callbacks firing.
    
    # We simulate a "TOOL_CALL_COMPLETED" event because that's what the Detection Engine hashes for stuck loops
    event = RuntimeEvent(
        run_id=run_id,
        agent_id="dummy_e2e_agent",
        framework="langgraph",
        event_type="TOOL_CALL_COMPLETED",
        sequence_number=count,
        idempotency_key=f"{run_id}_tool_exec_{count}",
        status="success",
        tool="search_database",
        arguments_hash="hash_same_args",  # Deterministic!
        response_hash="hash_same_resp"    # Deterministic!
    )
    
    collector.ingest_event(event)
    
    # Allow telemetry queue to process
    time.sleep(0.05)
    
    return {"count": count + 1, "output": "Repeating..."}

def should_continue(state: AgentState):
    if state["count"] >= MAX_ITERATIONS:
        return END
    return "safety_gate"

# 1. Setup AgentFuse
run_id = str(uuid.uuid4())
adapter = LangGraphAdapter(agent_id="dummy_e2e_agent")
af = AgentFuse(adapter=adapter)

# Lower threshold for fast testing
collector.engine.detectors[0].config.repetition_threshold = 4

# 2. Build Graph
builder = StateGraph(AgentState)
builder.add_node("safety_gate", af.safety_gate)
builder.add_node("tool_node", dummy_tool_node)

builder.set_entry_point("safety_gate")
builder.add_edge("safety_gate", "tool_node")
builder.add_conditional_edges("tool_node", should_continue)

checkpointer = MemorySaver()
graph = builder.compile(checkpointer=checkpointer)

# 3. Execute Graph
print(f"Starting agent run: {run_id}")
config = {"configurable": {"thread_id": run_id}, "callbacks": [af.telemetry]}

try:
    graph.invoke({"input": "start", "count": 0, "output": ""}, config=config)
except Exception as e:
    print(f"Execution stopped: {e}")

# Wait for telemetry to flush
print("Waiting for telemetry queue to drain...")
collector._queue.join()
print("Execution complete. Check AgentFuse for Protection status.")