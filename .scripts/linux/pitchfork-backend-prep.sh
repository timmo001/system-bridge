#!/usr/bin/env bash
# Frees :9170 for the dev backend. Pitchfork refuses to start a daemon whose
# port is taken, so this runs as a oneshot before it. It records how to bring
# the production backend back for pitchfork-backend-restore.sh.
set -euo pipefail

service="system-bridge.service"
port="9170/tcp"
dev_binary="$(pwd)/system-bridge-linux"
restore_dir="${XDG_RUNTIME_DIR:-/tmp}/system-bridge/dev-restore"

owner_exe() {
  local exe
  exe="$(readlink -f "/proc/$1/exe" 2>/dev/null || true)"
  # A package upgrade since the process started leaves this suffix
  printf '%s\n' "${exe% (deleted)}"
}

# Leave a running dev backend alone: pitchfork reruns this whenever the
# backend is started, even when it is already running.
for pid in $(fuser "$port" 2>/dev/null || true); do
  if [ "$(owner_exe "$pid")" = "$dev_binary" ]; then
    exit 0
  fi
done

# Only replace the record when production is found, so a restart doesn't drop
# one that is still waiting to be restored.
record() {
  rm -rf "$restore_dir"
  mkdir -p "$restore_dir"
  printf '%s\n' "$1" >"$restore_dir/kind"
}

if /usr/bin/systemctl --user is-active --quiet "$service"; then
  record service
else
  for pid in $(fuser "$port" 2>/dev/null || true); do
    case "$(basename "$(owner_exe "$pid")")" in
    system-bridge | system-bridge-linux)
      record process
      cp "/proc/$pid/cmdline" "$restore_dir/cmdline"
      readlink -f "/proc/$pid/cwd" >"$restore_dir/cwd" 2>/dev/null || pwd >"$restore_dir/cwd"
      break
      ;;
    esac
  done
fi

/usr/bin/systemctl --user stop "$service" >/dev/null 2>&1 || true
fuser -TERM -k "$port" >/dev/null 2>&1 || true
sleep 1
fuser -KILL -k "$port" >/dev/null 2>&1 || true
