"""
Framework adapters for attaching deterministic AgentFuse safety gates and telemetry observers
to agent frameworks (LangGraph, AutoGen, CrewAI).
"""

from agentfuse.adapters.base import FrameworkAdapter
from agentfuse.adapters.langgraph import LangGraphAdapter
from agentfuse.adapters.autogen import AutoGenAdapter

__all__ = [
    "FrameworkAdapter",
    "LangGraphAdapter",
    "AutoGenAdapter",
]
