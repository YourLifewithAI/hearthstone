#!/usr/bin/env bash
#
# Snapshot context files to the Hearthstone API KV store.
#
# Usage:
#   export HEARTHSTONE_API_KEY="your-64-char-hex"
#   export HEARTHSTONE_API_URL="https://your-worker.your-name.workers.dev"
#   ./scripts/snapshot.sh
#
# Requires: curl, jq

set -euo pipefail

: "${HEARTHSTONE_API_KEY:?set HEARTHSTONE_API_KEY}"
: "${HEARTHSTONE_API_URL:?set HEARTHSTONE_API_URL}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CTX_DIR="${CTX_DIR:-$SCRIPT_DIR/../context}"

if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required. Install with: brew install jq  (or apt install jq)" >&2
    exit 1
 fi

# Match CTX_KEYS in api/src/types.ts. If you add keys there, add matching files here.
KEYS=(about projects style notes)

files_json='['
sep=''
total=0
for key in "${KEYS[@]}"; do
    path="$CTX_DIR/$key.md"
    if [[ ! -f "$path" ]]; then
        echo "  $key  SKIP (not found): $path" >&2
        continue
    fi
    # jq -Rs reads raw stdin and emits a JSON-escaped string
    content=$(jq -Rs . < "$path")
    files_json+="${sep}{\"key\":\"$key\",\"content\":$content}"
    sep=','
    size=$(wc -c < "$path")
    total=$((total + size))
    printf "  %-10s %6d chars  %s\n" "$key" "$size" "$path"
done
files_json+=']'

if [[ "$files_json" == "[]" ]]; then
    echo "ERROR: no files to snapshot" >&2
    exit 1
fi

echo
echo "Snapshotting $(echo "$files_json" | jq 'length') files ($total total chars)..."

response=$(curl -sS -w "\n%{http_code}" -X POST "$HEARTHSTONE_API_URL/context/snapshot" \
    -H "Authorization: Bearer $HEARTHSTONE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"files\":$files_json}")

body=$(echo "$response" | sed '$ d')
status=$(echo "$response" | tail -n 1)

if [[ "$status" != "200" ]]; then
    echo "ERROR: HTTP $status" >&2
    echo "$body" >&2
    exit 1
fi

echo
echo "Snapshot complete."
echo "$body" | jq '{written, version: .meta.version, timestamp: .meta.timestamp}'
