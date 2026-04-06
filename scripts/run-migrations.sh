#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

# Export environment variables from .env.local/.env.example when present.
set -a
if [ -f .env.local ]; then
  # shellcheck source=/dev/null
  source .env.local
elif [ -f .env.example ]; then
  # shellcheck source=/dev/null
  source .env.example
fi
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Define it in .env.local or the environment before running."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed or not available in PATH."
  exit 1
fi

for migration in "$ROOT_DIR"/db/migrations/*.sql; do
  echo "Applying migration: $(basename "$migration")"
  psql "$DATABASE_URL" -f "$migration"
done
