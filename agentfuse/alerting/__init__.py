"""
Alerting and escalation subsystem for dispatching real-time notifications
(Slack Block Kit, generic webhooks) and automated on-call escalations.
"""

from agentfuse.alerting.dispatcher import AlertDispatcher
from agentfuse.alerting.security import validate_webhook_url, SSRFValidationError

__all__ = ["AlertDispatcher", "validate_webhook_url", "SSRFValidationError"]
