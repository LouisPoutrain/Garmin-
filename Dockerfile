# ==============================================================================
# Multi-Stage Production Dockerfile for Garmin Duo Coach Platform
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React/TypeScript Telemetry Frontend
# ------------------------------------------------------------------------------
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python 3.12 Runtime
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runner

WORKDIR /app

# Install system dependencies (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Astral uv for ultra-fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1 \
    HOST=0.0.0.0 \
    PORT=5050

# Copy dependency definition
COPY pyproject.toml README.md ./

# Install python dependencies
RUN uv pip install -e .

# Copy application code, knowledge doctrine, and athlete profiles
COPY src/ ./src/
COPY knowledge/ ./knowledge/
COPY athlete_profile.json athlete_profile_clara.json ./

# Copy compiled frontend telemetry assets from Stage 1 into the static directory
COPY --from=frontend-builder /app/src/garmin_coach/web/static ./src/garmin_coach/web/static

# Create directories for persistent storage and tokens
RUN mkdir -p /app/data /root/.garminconnect /root/.garminconnect_clara

# Mount point for persistent storage (SQLite, ChromaDB, Memories)
VOLUME ["/app/data"]

EXPOSE 5050

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${PORT:-5050}/api/status || exit 1

# Launch Garmin Coach Web Server
CMD ["python", "-m", "garmin_coach.web.app"]
