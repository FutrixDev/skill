#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/home/openclaw/.openclaw/logs"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "$LOG_DIR"

echo "[$STAMP] cleanup_openclaw_logs start retention_days=$RETENTION_DAYS"

mapfile -t old_logs < <(find "$LOG_DIR" -type f -name '*.log' -mtime +"$RETENTION_DAYS" | sort)
count="${#old_logs[@]}"

if (( count == 0 )); then
  echo "[$STAMP] no old logs found"
  exit 0
fi

printf '%s
' "${old_logs[@]}" | while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  echo "[$STAMP] deleting $path"
  rm -f -- "$path"
done

echo "[$STAMP] deleted_count=$count"
