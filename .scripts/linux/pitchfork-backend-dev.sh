#!/usr/bin/env bash
set -euo pipefail

service="system-bridge.service"
port="9170/tcp"
restore_kind="none"
restore_cwd=""
restore_cmd=()

capture_restore_target() {
	if /usr/bin/systemctl --user is-active --quiet "$service"; then
		restore_kind="service"
		return
	fi

	local pids pid exe
	pids="$(fuser "$port" 2>/dev/null || true)"
	for pid in $pids; do
		exe="$(basename "$(readlink -f "/proc/$pid/exe" 2>/dev/null || true)")"
		case "$exe" in
			system-bridge | system-bridge-linux)
				mapfile -d '' -t restore_cmd <"/proc/$pid/cmdline"
				restore_cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || pwd)"
				restore_kind="process"
				return
				;;
		esac
	done
}

restore_target() {
	case "$restore_kind" in
		service)
			/usr/bin/systemctl --user start "$service" >/dev/null 2>&1 || true
			;;
		process)
			if ((${#restore_cmd[@]} > 0)); then
				(
					cd "$restore_cwd" || exit 0
					nohup "${restore_cmd[@]}" >/dev/null 2>&1 &
				)
			fi
			;;
	esac
}

cleanup() {
	trap - EXIT INT TERM HUP
	restore_target
}

trap cleanup EXIT
trap 'exit 143' INT TERM HUP

capture_restore_target
/usr/bin/systemctl --user stop "$service" >/dev/null 2>&1 || true
fuser -TERM -k "$port" >/dev/null 2>&1 || true
sleep 1
fuser -KILL -k "$port" >/dev/null 2>&1 || true

mise run run:backend-dev
