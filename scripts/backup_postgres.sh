#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# AgentFuse — PostgreSQL Backup Script
# ═══════════════════════════════════════════════════════════
# Writes a timestamped pg_dump to /opt/agentfuse/backups/.
# Safe to run from a host crontab entry.
#
# Usage:
#   sudo bash /opt/agentfuse/repo/scripts/backup_postgres.sh
#
# Crontab example (daily at 03:00):
#   0 3 * * * /opt/agentfuse/repo/scripts/backup_postgres.sh >> /opt/agentfuse/backups/backup.log 2>&1
# ═══════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_DIR="/opt/agentfuse/backups"
CONTAINER_NAME="agentfuse-postgres-1"  # default compose service name
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${BACKUP_DIR}/agentfuse_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "[$(date -Iseconds)] Starting backup..."

# Run pg_dump inside the running Postgres container and gzip on the host
docker exec "${CONTAINER_NAME}" \
  pg_dump -U agentfuse -d agentfuse_db --no-owner --no-privileges \
  | gzip > "${DUMP_FILE}"

DUMP_SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${DUMP_FILE} (${DUMP_SIZE})"

# Prune old backups beyond retention window
DELETED=$(find "${BACKUP_DIR}" -name "agentfuse_db_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "[$(date -Iseconds)] Pruned ${DELETED} backups older than ${RETENTION_DAYS} days."
