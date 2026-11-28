#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="${BACKUP_DIR:-${repo_dir}/backups}"
if [[ "${backup_dir}" != /* ]]; then
  backup_dir="${repo_dir}/${backup_dir#./}"
fi
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="${backup_dir}/smart-attendance-${timestamp}.dump"

mkdir -p "${backup_dir}"
chmod 700 "${backup_dir}"

cd "${repo_dir}"
docker compose exec -T db sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "${output}"
chmod 600 "${output}"

echo "Database backup created: ${output}"
