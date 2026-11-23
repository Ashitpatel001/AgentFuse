"""
Webhook Security & SSRF Protection
Validates outbound webhook URLs at registration and before every dispatch.
"""
import ipaddress
import socket
from typing import Optional
from urllib.parse import urlparse

from agentfuse.config import settings


class SSRFValidationError(ValueError):
    """Raised when a webhook URL violates SSRF or security constraints."""
    pass


METADATA_IP = ipaddress.ip_address("169.254.169.254")


def validate_webhook_url(url: str, environment: Optional[str] = None) -> None:
    """
    Validate a webhook URL against SSRF attacks:
    - https only when ENVIRONMENT=production
    - Disallow non-http/https schemes
    - Reject missing or invalid hostname
    - Resolve DNS and reject:
      * loopback (127.0.0.0/8, ::1)
      * private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7)
      * link-local (169.254.0.0/16, fe80::/10)
      * cloud metadata (169.254.169.254)
      * unspecified / reserved
    """
    if not url or not isinstance(url, str):
        raise SSRFValidationError("Webhook URL must be a non-empty string")

    parsed = urlparse(url.strip())
    scheme = (parsed.scheme or "").lower()

    env = environment if environment is not None else settings.ENVIRONMENT

    if env == "production":
        if scheme != "https":
            raise SSRFValidationError("In production, webhook URLs must use HTTPS")
    else:
        if scheme not in ("http", "https"):
            raise SSRFValidationError(f"Invalid webhook URL scheme: '{scheme}'. Must be HTTP or HTTPS")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFValidationError("Webhook URL must contain a valid hostname")

    # Resolve DNS to check all candidate IP addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as e:
        raise SSRFValidationError(f"Could not resolve hostname '{hostname}': {e}")
    except Exception as e:
        raise SSRFValidationError(f"DNS resolution error for '{hostname}': {e}")

    if not addr_info:
        raise SSRFValidationError(f"No IP address found for hostname '{hostname}'")

    for entry in addr_info:
        sockaddr = entry[4]
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            raise SSRFValidationError(f"Invalid resolved IP address: '{ip_str}'")

        # Handle IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped

        # 169.254.169.254 (Cloud metadata service)
        if ip == METADATA_IP or str(ip) == "169.254.169.254":
            raise SSRFValidationError("Webhook URL resolves to forbidden cloud metadata address (169.254.169.254)")

        # Loopback (127.0.0.0/8, ::1)
        if ip.is_loopback:
            raise SSRFValidationError(f"Webhook URL resolves to forbidden loopback address: {ip}")

        # Link-local (169.254.0.0/16, fe80::/10)
        if ip.is_link_local:
            raise SSRFValidationError(f"Webhook URL resolves to forbidden link-local address: {ip}")

        # Private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7)
        if ip.is_private:
            raise SSRFValidationError(f"Webhook URL resolves to forbidden private address: {ip}")

        # Unspecified or reserved (0.0.0.0, ::, multicast, etc.)
        if ip.is_unspecified or ip.is_reserved or ip.is_multicast:
            raise SSRFValidationError(f"Webhook URL resolves to forbidden address: {ip}")
