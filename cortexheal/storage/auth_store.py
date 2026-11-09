"""
Storage for the human-auth plane (organizations, users, sessions, invitations).

Reuses the shared connection pool from postgres.py. Session and invite tokens
are stored ONLY as SHA-256 hashes; the raw token is returned once to the caller.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from psycopg2.extras import RealDictCursor

from cortexheal.storage.postgres import get_connection
from cortexheal.models.auth import (
    Organization, UserAccount, Session, Invitation,
    generate_session_token, hash_token, hash_password,
    SESSION_TTL_HOURS, INVITE_TTL_HOURS,
)


# --- organizations -------------------------------------------------------
def create_organization(org: Organization) -> Organization:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO organizations (org_id, name, created_at) VALUES (%s, %s, %s)",
                (org.org_id, org.name, org.created_at),
            )
        conn.commit()
    return org


def get_organization(org_id: str) -> Optional[Organization]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM organizations WHERE org_id = %s", (org_id,))
            row = cur.fetchone()
    return Organization(**row) if row else None


# --- users ---------------------------------------------------------------
def create_user_account(user: UserAccount) -> UserAccount:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO users
                   (user_id, org_id, email, password_hash, role, status, created_at, last_login_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (user.user_id, user.org_id, user.email.lower(), user.password_hash,
                 user.role, user.status, user.created_at, user.last_login_at),
            )
        conn.commit()
    return user


def get_user_by_email(email: str) -> Optional[UserAccount]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (email.lower(),))
            row = cur.fetchone()
    return UserAccount(**row) if row else None


def list_users_by_org(org_id: str) -> list:
    """List an org's members (no password hashes) for the Team screen."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT user_id, email, role, status, created_at, last_login_at
                   FROM users WHERE org_id = %s ORDER BY created_at ASC""",
                (org_id,),
            )
            rows = cur.fetchall()
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()
        if r.get("last_login_at"):
            r["last_login_at"] = r["last_login_at"].isoformat()
    return rows


def get_user_by_id(user_id: str) -> Optional[UserAccount]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
    return UserAccount(**row) if row else None


def update_user_last_login(user_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET last_login_at = %s WHERE user_id = %s",
                        (datetime.now(timezone.utc), user_id))
        conn.commit()


# --- sessions ------------------------------------------------------------
def create_session_for_user(user_id: str) -> str:
    """Create a session; return the RAW token (store only its hash)."""
    raw = generate_session_token()
    sess = Session(
        token_hash=hash_token(raw),
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS),
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO sessions (session_id, token_hash, user_id, created_at, expires_at)
                   VALUES (%s, %s, %s, %s, %s)""",
                (sess.session_id, sess.token_hash, sess.user_id, sess.created_at, sess.expires_at),
            )
        conn.commit()
    return raw


def resolve_session(raw_token: str) -> Optional[dict]:
    """Return {user_id, org_id, role, email} for a valid session, else None.
    Valid = not revoked, not expired, and the user is ACTIVE."""
    if not raw_token:
        return None
    th = hash_token(raw_token)
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT u.user_id, u.org_id, u.role, u.email
                   FROM sessions s JOIN users u ON s.user_id = u.user_id
                   WHERE s.token_hash = %s
                     AND s.revoked_at IS NULL
                     AND s.expires_at > now()
                     AND u.status = 'ACTIVE'""",
                (th,),
            )
            return cur.fetchone()


def revoke_session(raw_token: str) -> bool:
    if not raw_token:
        return False
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sessions SET revoked_at = now() WHERE token_hash = %s AND revoked_at IS NULL",
                (hash_token(raw_token),),
            )
            revoked = cur.rowcount
        conn.commit()
    return revoked > 0


# --- invitations ---------------------------------------------------------
def create_invitation(org_id: str, email: str, role: str, invited_by: Optional[str]) -> str:
    """Create a single-use, expiring invite; return the RAW token."""
    raw = generate_session_token()
    inv = Invitation(
        org_id=org_id, email=email.lower(), role=role,
        token_hash=hash_token(raw), invited_by=invited_by,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=INVITE_TTL_HOURS),
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO invitations
                   (invite_id, org_id, email, role, token_hash, invited_by, created_at, expires_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (inv.invite_id, inv.org_id, inv.email, inv.role, inv.token_hash,
                 inv.invited_by, inv.created_at, inv.expires_at),
            )
        conn.commit()
    return raw


def get_pending_invitation(raw_token: str) -> Optional[Invitation]:
    """Return an unexpired, unaccepted invitation for the raw token, else None."""
    if not raw_token:
        return None
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT * FROM invitations
                   WHERE token_hash = %s AND accepted_at IS NULL AND expires_at > now()""",
                (hash_token(raw_token),),
            )
            row = cur.fetchone()
    return Invitation(**row) if row else None


def mark_invitation_accepted(invite_id: str) -> bool:
    """Atomically mark accepted; returns False if already accepted (single-use)."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE invitations SET accepted_at = now() WHERE invite_id = %s AND accepted_at IS NULL",
                (invite_id,),
            )
            claimed = cur.rowcount
        conn.commit()
    return claimed > 0


# --- bootstrap (CLI/first-admin) ----------------------------------------
def bootstrap_org_and_admin(org_name: str, email: str, password: str, role: str = "ADMIN"):
    """Create an organization and its first user. Used by the CLI to stand up a
    new tenant, and by tests. There is no public self-service signup (deferred)."""
    org = create_organization(Organization(name=org_name))
    user = UserAccount(
        org_id=org.org_id, email=email.lower(),
        password_hash=hash_password(password), role=role,
    )
    create_user_account(user)
    return org, user
