"""
AgentFuse: The 24ms Circuit Breaker & Safety Firewall for Autonomous AI Agents.
Stops runaway tool loops before they burn your budget.
"""

from agentfuse.client import AgentFuse
from agentfuse.config import settings
from agentfuse.adapters.langgraph import LangGraphAdapter
from agentfuse.adapters.autogen import AutoGenAdapter

__version__ = "0.1.0"

__all__ = [
    "AgentFuse",
    "settings",
    "LangGraphAdapter",
    "AutoGenAdapter",
]
