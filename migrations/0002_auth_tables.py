"""
Human-auth plane (ADR-005): organizations, users, sessions, invitations.

The machine-auth plane (api_keys) is untouched. `organizations` becomes the
canonical tenant table; users/sessions/invitations FK to it. Existing tables
keep their `org_id` string column (no retroactive FK, to avoid disrupting live
data) — a later migration can backfill orgs and add those FKs.
"""
from yoyo import step

__depends__ = {"0001_baseline_schema"}

steps = [
    step(
        """
        CREATE TABLE organizations (
            org_id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
        """,
        "DROP TABLE IF EXISTS organizations CASCADE;",
    ),
    step(
        """
        CREATE TABLE users (
            user_id VARCHAR(36) PRIMARY KEY,
            org_id VARCHAR(100) NOT NULL REFERENCES organizations(org_id),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            last_login_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX idx_users_org ON users(org_id);
        CREATE INDEX idx_users_email ON users(email);
        """,
        "DROP TABLE IF EXISTS users CASCADE;",
    ),
    step(
        """
        CREATE TABLE sessions (
            session_id VARCHAR(36) PRIMARY KEY,
            token_hash VARCHAR(64) UNIQUE NOT NULL,
            user_id VARCHAR(36) NOT NULL REFERENCES users(user_id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            revoked_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX idx_sessions_token ON sessions(token_hash);
        CREATE INDEX idx_sessions_user ON sessions(user_id);
        """,
        "DROP TABLE IF EXISTS sessions CASCADE;",
    ),
    step(
        """
        CREATE TABLE invitations (
            invite_id VARCHAR(36) PRIMARY KEY,
            org_id VARCHAR(100) NOT NULL REFERENCES organizations(org_id),
            email VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL,
            token_hash VARCHAR(64) UNIQUE NOT NULL,
            invited_by VARCHAR(36) REFERENCES users(user_id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            accepted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX idx_invitations_token ON invitations(token_hash);
        CREATE INDEX idx_invitations_org ON invitations(org_id);
        """,
        "DROP TABLE IF EXISTS invitations CASCADE;",
    ),
]
