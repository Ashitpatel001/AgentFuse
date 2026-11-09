"""Create a demo org and admin user for local testing."""
import uuid
from datetime import datetime, timezone

from cortexheal.storage.postgres import init_db
from cortexheal.storage.auth_store import create_organization, create_user_account
from cortexheal.models.auth import Organization, UserAccount, hash_password

init_db()

org_id = "default_org"
try:
    create_organization(Organization(
        org_id=org_id,
        name="CortexHeal Demo",
        created_at=datetime.now(timezone.utc),
    ))
    print(f"Org created: {org_id}")
except Exception as e:
    print(f"Org: {e}")

try:
    create_user_account(UserAccount(
        user_id=str(uuid.uuid4()),
        org_id=org_id,
        email="admin@cortexheal.dev",
        password_hash=hash_password("demo1234"),
        role="ADMIN",
        status="ACTIVE",
        created_at=datetime.now(timezone.utc),
    ))
    print("User created: admin@cortexheal.dev / demo1234")
except Exception as e:
    print(f"User: {e}")
