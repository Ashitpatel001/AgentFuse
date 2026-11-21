"""
AgentFuse: The Reliability & Safety Platform for Autonomous AI Agents.
Stop runaway tool loops, enforce strict budget firewalls, and self-heal stuck agent runs in real time.
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
