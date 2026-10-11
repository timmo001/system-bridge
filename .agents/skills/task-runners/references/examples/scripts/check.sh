#!/usr/bin/env bash
# Run independent checks in parallel, label their output, and report every failure.
#
# - Wait on each PID: a bare `wait` returns 0 whatever the jobs did.
# - pipefail makes each job's status the check's, not the labelling loop's.
# - Run writers (formatters, generators) before this script, not inside it.
set -uo pipefail

pids=()
names=()

run() {
  local name=$1
  shift
  "$@" 2>&1 | while IFS= read -r line; do printf '[%s] %s\n' "$name" "$line"; done &
  pids+=("$!")
  names+=("$name")
}

run lint npm run --silent lint
run typecheck npm run --silent typecheck
run test npm run --silent test
# ...

status=0
for i in "${!pids[@]}"; do
  if ! wait "${pids[$i]}"; then
    echo "[${names[$i]}] failed" >&2
    status=1
  fi
done
exit "$status"
