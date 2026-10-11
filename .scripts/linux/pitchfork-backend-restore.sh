#!/usr/bin/env bash
# on_exit hook for the backend daemon: brings back the production backend that
# pitchfork-backend-prep.sh stopped. Pitchfork runs hooks after the daemon has
# exited and outside its process group, so the port is already free.
set -euo pipefail

restore_dir="${XDG_RUNTIME_DIR:-/tmp}/system-bridge/dev-restore"

# On a restart the hook fires after the next start has begun. Leave the
# record for the stop that ends that run.
sleep 1
case "$(pitchfork status "$PITCHFORK_DAEMON_ID" 2>/dev/null)" in
*"Status: running"* | *"Status: waiting"*) exit 0 ;;
esac

case "$(cat "$restore_dir/kind" 2>/dev/null || true)" in
service)
  rm -rf "$restore_dir"
  exec /usr/bin/systemctl --user start system-bridge.service
  ;;
process)
  mapfile -d '' -t restore_cmd <"$restore_dir/cmdline"
  cwd="$(cat "$restore_dir/cwd")"
  rm -rf "$restore_dir"
  cd "$cwd"
  # Pitchfork waits on hooks, so the restored backend runs detached
  setsid -f "${restore_cmd[@]}" >/dev/null 2>&1 </dev/null
  ;;
*)
  rm -rf "$restore_dir"
  ;;
esac
