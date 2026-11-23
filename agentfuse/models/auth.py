from datetime import datetime, timezone
from typing import Optional, Literal
from pydantic import BaseModel, Field
import uuid
import secrets
import hashlib

def hash_key(raw_key: str) -> str:
    """Compute SHA-256 hash of plaintext API key."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

def generate_raw_key(role: str) -> str:
    """Generate cryptographically secure API key with cosmetic role prefix."""
    token_hex = secrets.token_hex(24)
    return f"af_live_{role.lower()}_{token_hex}"

class ApiKey(BaseModel):
    key_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key_hash: str
    key_prefix: str
    name: str
    org_id: str
    role: Literal["VIEWER", "OPERATOR", "ADMIN"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Human-readable name or purpose for this key")
    role: Literal["VIEWER", "OPERATOR", "ADMIN"] = Field(..., description="Role assigned to this key")

class ApiKeyResponse(BaseModel):
    key_id: str
    key_prefix: str
    name: str
    org_id: str
    role: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

class ApiKeyCreatedResponse(ApiKeyResponse):
    raw_key: str = Field(..., description="Plaintext secret key. Displayed exactly once.")


# ==========================================================================
# Human-auth plane (ADR-005): organizations, users, sessions, invitations.
# ==========================================================================
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

# argon2id defaults are strong and current; no hand-rolled crypto.
_password_hasher = PasswordHasher()

SESSION_TTL_HOURS = 12
INVITE_TTL_HOURS = 72
SESSION_COOKIE_NAME = "agentfuse_session"

Role = Literal["VIEWER", "OPERATOR", "ADMIN"]


def hash_password(plaintext: str) -> str:
    """Hash a password with argon2id. Never store or log the plaintext."""
    return _password_hasher.hash(plaintext)


def verify_password(password_hash: str, plaintext: str) -> bool:
    """Constant-time-ish verify; returns False on any mismatch/malformed hash."""
    try:
        return _password_hasher.verify(password_hash, plaintext)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def generate_session_token() -> str:
    """256 bits of entropy, URL-safe. The raw token goes to the cookie; only its
    SHA-256 hash is stored, so a DB leak does not yield usable sessions."""
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """SHA-256 of an opaque session/invite token (fast lookup, safe at rest)."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class Organization(BaseModel):
    org_id: str = Field(default_factory=lambda: f"org_{uuid.uuid4().hex[:12]}")
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserAccount(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    email: str
    password_hash: str
    role: Role
    status: Literal["ACTIVE", "DISABLED"] = "ACTIVE"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = None


class Session(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    token_hash: str
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    revoked_at: Optional[datetime] = None


class Invitation(BaseModel):
    invite_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    email: str
    role: Role
    token_hash: str
    invited_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    accepted_at: Optional[datetime] = None


# --- request/response DTOs ---
class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=1024)


class InviteRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    role: Role


class AcceptInviteRequest(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)
    password: str = Field(..., min_length=8, max_length=1024)


class AuthUserResponse(BaseModel):
    user_id: str
    email: str
    org_id: str
    role: str
    auth: Literal["session", "api_key"] = "session"
