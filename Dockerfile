# Use official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production

# Set work directory
WORKDIR /app

# Install system dependencies (e.g. for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml README.md ./
COPY agentfuse/ ./agentfuse/
COPY scripts/ ./scripts/
# Migrations are the single source of truth for the schema and MUST ship with
# the image (the app applies them at startup via init_db()).
COPY migrations/ ./migrations/

# The package installs non-editable (runs from site-packages), so point the
# migration runner at the copied migrations explicitly.
ENV AGENTFUSE_MIGRATIONS_DIR=/app/migrations

# Install the application and its dependencies without editable mode
RUN pip install --no-cache-dir .

# Create a non-root user for security and adjust permissions
RUN useradd -m agentfuseuser && chown -R agentfuseuser:agentfuseuser /app
USER agentfuseuser

# Expose port (default 8000)
ENV PORT=8000
EXPOSE 8000

# Add HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start Uvicorn server (respects PORT dynamically while defaulting to 8000)
CMD ["sh", "-c", "exec uvicorn agentfuse.server.api:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${AGENTFUSE_WORKERS:-4}"]