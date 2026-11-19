"""
AgentFuse: The 24ms Circuit Breaker & Safety Firewall for Autonomous AI Agents.
Stops runaway tool loops before they burn your budget.
"""

from cortexheal.client import CortexHeal as AgentFuse, CortexHeal
from cortexheal.config import settings
from cortexheal.adapters.langgraph import LangGraphAdapter
from cortexheal.adapters.autogen import AutoGenAdapter
import cortexheal.adapters as adapters
import cortexheal.cli as cli
import cortexheal.models as models

__version__ = "0.1.0"

__all__ = [
    "AgentFuse",
    "CortexHeal",
    "settings",
    "LangGraphAdapter",
    "AutoGenAdapter",
    "adapters",
    "cli",
    "models",
]
