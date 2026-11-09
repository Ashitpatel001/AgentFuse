"""
Baseline schema (yoyo).

This is the single source of truth for the CortexHeal database schema. It is
intentionally idempotent (CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
CREATE INDEX IF NOT EXISTS) so that:
  * a fresh deploy builds the complete, correct schema (including org_id on the
    core tables, which every prior build path was missing), and
  * databases created by the old ad-hoc init_db() are adopted without a
    destructive reset.

Every migration after this one is a plain forward delta (no IF NOT EXISTS).
"""
from yoyo import step

__depends__ = {}

SCHEMA = r"""
-- ------------------------------------------------------------------ runs
CREATE TABLE IF NOT EXISTS runs (
    run_id VARCHAR(36) PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    framework VARCHAR(50),
    model VARCHAR(100),
    provider VARCHAR(100),
    status VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    total_tokens INTEGER DEFAULT 0,
    total_cost DOUBLE PRECISION,
    failure_reason TEXT,
    protection_mode VARCHAR(20) DEFAULT 'ACTIVE',
    org_id VARCHAR(100) NOT NULL DEFAULT 'default_org'
);
-- Defensive adoption of DBs created before these columns existed:
ALTER TABLE runs ADD COLUMN IF NOT EXISTS protection_mode VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE runs ADD COLUMN IF NOT EXISTS org_id VARCHAR(100) NOT NULL DEFAULT 'default_org';
CREATE INDEX IF NOT EXISTS idx_runs_org_id ON runs(org_id);

-- ---------------------------------------------------------------- events
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(36) PRIMARY KEY,
    run_id VARCHAR(36) REFERENCES runs(run_id),
    agent_id VARCHAR(255),
    parent_run_id VARCHAR(36),
    timestamp TIMESTAMP WITH TIME ZONE,
    event_type VARCHAR(50),
    tool VARCHAR(255),
    arguments_hash VARCHAR(64),
    response_hash VARCHAR(64),
    tokens_prompt INTEGER,
    tokens_completion INTEGER,
    tokens_total INTEGER,
    cost DOUBLE PRECISION,
    latency_ms INTEGER,
    state_hash VARCHAR(64),
    status VARCHAR(50),
    sequence_number INTEGER,
    framework VARCHAR(50),
    model VARCHAR(100),
    provider VARCHAR(100),
    trace_id VARCHAR(100),
    span_id VARCHAR(100),
    idempotency_key VARCHAR(100) UNIQUE,
    environment VARCHAR(50),
    policy_version VARCHAR(50),
    detector_version VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_agent_id ON events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
-- Hot path: StuckLoopDetector fetches the most recent tool calls for a run.
CREATE INDEX IF NOT EXISTS idx_events_run_seq ON events(run_id, sequence_number DESC);

-- ------------------------------------------------------------- incidents
CREATE TABLE IF NOT EXISTS incidents (
    incident_id VARCHAR(36) PRIMARY KEY,
    run_id VARCHAR(36) REFERENCES runs(run_id),
    agent_id VARCHAR(255),
    failure_type VARCHAR(50),
    severity VARCHAR(20),
    status VARCHAR(20),
    detector VARCHAR(50),
    detector_version VARCHAR(20),
    trigger_event_id VARCHAR(36),
    triggered_at TIMESTAMP WITH TIME ZONE,
    evidence JSONB,
    observed_value JSONB,
    threshold JSONB,
    description TEXT,
    UNIQUE(run_id, failure_type, detector_version)
);
-- Incidents are org-scoped by joining to runs; index the join column.
CREATE INDEX IF NOT EXISTS idx_incidents_run_id ON incidents(run_id);

-- -------------------------------------------------------- audit_events
CREATE TABLE IF NOT EXISTS audit_events (
    event_id VARCHAR(36) PRIMARY KEY,
    run_id VARCHAR(36),
    incident_id VARCHAR(36),
    timestamp TIMESTAMP WITH TIME ZONE,
    action VARCHAR(50),
    actor VARCHAR(50),
    result VARCHAR(50),
    reason TEXT,
    policy_version VARCHAR(20),
    actor_type VARCHAR(20) DEFAULT 'SYSTEM',
    actor_id VARCHAR(100) DEFAULT 'SYSTEM'
);
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_type VARCHAR(20) DEFAULT 'SYSTEM';
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS actor_id VARCHAR(100) DEFAULT 'SYSTEM';
CREATE INDEX IF NOT EXISTS idx_audit_run_id ON audit_events(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_incident_id ON audit_events(incident_id);

-- ------------------------------------------------------- recovery_plans
CREATE TABLE IF NOT EXISTS recovery_plans (
    plan_id VARCHAR(36) PRIMARY KEY,
    incident_id VARCHAR(36),
    run_id VARCHAR(36),
    diagnosis TEXT,
    confidence FLOAT,
    proposed_actions JSONB,
    risk_level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    planner_type VARCHAR(50),
    status VARCHAR(20),
    snapshot_run_status VARCHAR(50) DEFAULT 'unknown',
    snapshot_sequence_number INTEGER DEFAULT 0,
    ai_analysis JSONB,
    verification_status VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_incident ON recovery_plans(incident_id);

-- ----------------------------------------------------- recovery_actions
CREATE TABLE IF NOT EXISTS recovery_actions (
    action_id VARCHAR(36) PRIMARY KEY,
    run_id VARCHAR(36),
    incident_id VARCHAR(36),
    action_type VARCHAR(50),
    reason TEXT,
    parameters JSONB,
    risk_level VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20)
);

-- ------------------------------------------------------ pattern_records
CREATE TABLE IF NOT EXISTS pattern_records (
    pattern_id VARCHAR(36) PRIMARY KEY,
    framework VARCHAR(50),
    agent_id VARCHAR(255),
    failure_type VARCHAR(50),
    org_id VARCHAR(36) NOT NULL,
    fingerprint VARCHAR(128),
    UNIQUE(org_id, fingerprint),
    fingerprint_version VARCHAR(20),
    occurrences INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_promotion_candidate BOOLEAN DEFAULT FALSE
);

-- ---------------------------------------------------- recovery_outcomes
CREATE TABLE IF NOT EXISTS recovery_outcomes (
    outcome_id VARCHAR(36) PRIMARY KEY,
    run_id VARCHAR(36),
    incident_id VARCHAR(36),
    pattern_id VARCHAR(36) REFERENCES pattern_records(pattern_id),
    action_type VARCHAR(50),
    ai_recommendation VARCHAR(50),
    human_decision VARCHAR(50),
    approval_actor VARCHAR(100),
    execution_result VARCHAR(50),
    verification_result VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_outcomes_pattern ON recovery_outcomes(pattern_id);

-- ------------------------------------------------------------- api_keys
CREATE TABLE IF NOT EXISTS api_keys (
    key_id VARCHAR(36) PRIMARY KEY,
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    key_prefix VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    org_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);

-- ------------------------------------------------------ webhook_configs
CREATE TABLE IF NOT EXISTS webhook_configs (
    webhook_id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    secret_token TEXT,
    min_severity VARCHAR(20) DEFAULT 'HIGH',
    escalation_timeout_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_org ON webhook_configs(org_id);

-- ------------------------------------------------- notification_records
CREATE TABLE IF NOT EXISTS notification_records (
    notification_id VARCHAR(36) PRIMARY KEY,
    org_id VARCHAR(100) NOT NULL,
    incident_id VARCHAR(36) NOT NULL,
    run_id VARCHAR(36) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    target_url TEXT NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL,
    status_code INTEGER,
    response_body TEXT,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notification_records(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_incident ON notification_records(incident_id);
"""

steps = [step(SCHEMA)]
