import time
import pytest
from unittest.mock import patch
from agentfuse.runtime.collector import RuntimeCollector
from agentfuse.models.events import RuntimeEvent
from agentfuse.telemetry import metrics

def mock_llm_call():
    time.sleep(0.01)  # Simulated LLM call (10ms)
    return "mock_response"

def baseline_workload(num_iterations):
    start_time = time.time()
    for _ in range(num_iterations):
        mock_llm_call()
    return time.time() - start_time

def agentfuse_workload(num_iterations, collector):
    with patch('agentfuse.runtime.collector.save_event', return_value=True), \
         patch('agentfuse.runtime.collector.save_run', return_value=True), \
         patch('agentfuse.runtime.collector.get_run', return_value=None), \
         patch('agentfuse.detection.engine.DetectionEngine.evaluate', return_value=[]):
        start_time = time.time()
        for i in range(num_iterations):
            # The agent does the LLM call
            mock_llm_call()
            # AgentFuse observes it
            collector.ingest_event(RuntimeEvent(
                framework="langgraph", run_id="run1", agent_id="agent1",
                event_type="TOOL_CALL_COMPLETED", status="success",
                sequence_number=i, idempotency_key=str(i), tool="mock"
            ))
        
        agent_time = time.time() - start_time
        # Note: we do NOT wait for collector._queue.join() here to measure
        # the exact perceived latency overhead for the agent itself.
        return agent_time

def test_baseline_vs_agentfuse():
    num_iterations = 100
    
    # 1. Measure Baseline
    baseline_latency = baseline_workload(num_iterations)
    
    # 2. Measure AgentFuse
    collector = RuntimeCollector()
    agentfuse_latency = agentfuse_workload(num_iterations, collector)
    collector.shutdown()
    
    # Calculate Overhead
    absolute_overhead = agentfuse_latency - baseline_latency
    percentage_overhead = (absolute_overhead / baseline_latency) * 100
    
    print(f"\n--- Baseline vs AgentFuse Overhead ---")
    print(f"Iterations: {num_iterations} (10ms simulated LLM)")
    print(f"Baseline Latency: {baseline_latency:.4f}s")
    print(f"AgentFuse Latency: {agentfuse_latency:.4f}s")
    print(f"Absolute Overhead: {absolute_overhead:.4f}s")
    print(f"Percentage Overhead: {percentage_overhead:.2f}%")
    
    assert percentage_overhead < 15.0  # Require overhead < 15% to avoid CI flakiness
