#!/usr/bin/env bash

main() {
  mode="${1:-}"
  out_dir="${2:-}"
  if [ -z "$out_dir" ]; then
    echo "usage: host-core.sh prepare|capture <out-dir>" >&2
    exit 0
  fi
  mkdir -p "$out_dir" || true

  if [ "$mode" = prepare ]; then
    if ! cat /proc/sys/kernel/core_pattern > "$out_dir/host-core-pattern.txt" 2> /dev/null; then
      exit 0
    fi
    {
      df -Pk / /mnt "${RUNNER_TEMP:-/tmp}"
      disk=/tmp
      largest=0
      for candidate in /tmp /mnt "${RUNNER_TEMP:-/tmp}"; do
        [ -d "$candidate" ] || continue
        available="$(df -Pk "$candidate" 2> /dev/null | awk 'END {print $4}')"
        if [[ "$available" =~ ^[0-9]+$ ]] && [ "$available" -gt "$largest" ]; then
          largest="$available"
          disk="$candidate"
        fi
      done
      core_dir="$(sudo -n mktemp -d "$disk/pte-core.XXXXXX")"
      if [ -n "$core_dir" ]; then
        sudo -n chown "$(id -u):$(id -g)" "$core_dir" || true
        printf '%s\n' "$core_dir" > "$out_dir/host-core-dir.txt" || true
        printf '%s/core.%%p.%%s\n' "$core_dir" | sudo -n tee /proc/sys/kernel/core_pattern
      fi
      ancestor="$PPID"
      while [[ "$ancestor" =~ ^[0-9]+$ ]] && [ "$ancestor" -gt 1 ]; do
        ancestor_exe="$(readlink "/proc/$ancestor/exe" 2> /dev/null)"
        if [ "${ancestor_exe##*/}" = Runner.Worker ]; then
          sudo -n prlimit --pid "$ancestor" --core=unlimited:unlimited || true
          break
        fi
        ancestor="$(awk '/^PPid:/ {print $2}' "/proc/$ancestor/status" 2> /dev/null)"
      done
      if ! command -v gdb; then
        timeout --kill-after=5 90 bash -c '
          sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends gdb || {
            sudo -n apt-get update
            sudo -n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends gdb
          }
        ' || true
      fi
      if ! command -v gdb; then
        printf 'stacks unavailable: gdb could not be installed\n'
      fi
      if [ -n "${ANDROID_HOME:-}" ]; then
        if [ -s "$ANDROID_HOME/emulator/source.properties" ]; then
          sed -n 's/^Pkg.Revision[[:space:]]*=[[:space:]]*/Android emulator version /p' "$ANDROID_HOME/emulator/source.properties" > "$out_dir/host-emulator-version.txt"
        fi
        if [ ! -s "$out_dir/host-emulator-version.txt" ]; then
          timeout 10 "$ANDROID_HOME/emulator/emulator" -version > "$out_dir/host-emulator-version.txt" 2>&1 || true
        fi
      fi
    } > "$out_dir/host-core-setup.txt" 2>&1
  elif [ "$mode" = capture ]; then
    core_dir="$(cat "$out_dir/host-core-dir.txt" 2> /dev/null)"
    [ -d "$core_dir" ] || exit 0
    debugger_group=""
    trap 'exit 143' TERM
    trap cleanup EXIT
    deadline=$((SECONDS + 120))
    for core in "$core_dir"/core.*; do
      [ -f "$core" ] || continue
      name="${core##*/}"
      if [[ ! "$name" =~ ^core\.([0-9]+)\.([0-9]+)$ ]]; then
        continue
      fi
      pid="${BASH_REMATCH[1]}"
      signal_number="${BASH_REMATCH[2]}"
      signal_name="$(kill -l "$signal_number" 2> /dev/null)"
      while [ "$SECONDS" -lt "$deadline" ]; do
        if ! grep -q '^CoreDumping:[[:space:]]*1$' "/proc/$pid/status" 2> /dev/null; then
          break
        fi
        sleep 1
      done
      {
        printf 'HOST_CORE pid=%s signal=SIG%s\n' "$pid" "$signal_name"
        printf 'core=%s size_bytes=%s disk_bytes=%s\n' "$core" "$(stat -c %s "$core")" "$(du -B1 "$core" | cut -f1)"
        executable="$(cat "$out_dir/host-exe-$pid.txt" 2> /dev/null)"
        printf 'executable=%s\n' "${executable:-unavailable}"
        cat "$out_dir/host-emulator-version.txt" 2> /dev/null || true
        if [ -n "$executable" ] && command -v gdb > /dev/null; then
          # Without job control, $! is the debugger group leader that cleanup kills.
          setsid timeout --kill-after=5 60 gdb -nx --batch \
            -ex 'set auto-load off' \
            -ex 'set debuginfod enabled off' \
            -ex 'set pagination off' \
            -ex 'info program' \
            -ex 'info threads' \
            -ex 'bt' \
            -ex 'thread apply all bt 5' \
            "$executable" "$core" > "$core_dir/gdb-output.txt" 2>&1 &
          debugger_group=$!
          wait "$debugger_group" || true
          debugger_group=""
          sed "/^warning: Can't open file .*\\(memfd:\\|kvm-vcpu\\)/d" "$core_dir/gdb-output.txt"
          rm -f "$core_dir/gdb-output.txt"
        elif [ -n "$executable" ]; then
          printf 'stacks unavailable: gdb could not be installed\n'
        else
          printf 'No recorded emulator executable for pid %s\n' "$pid"
        fi
      } >> "$out_dir/host-core.txt" 2>&1
      rm -f "$core" || true
    done
    rmdir "$core_dir" 2> /dev/null || true
  fi

  exit 0
}

cleanup() {
  if [ -n "$debugger_group" ]; then
    kill -KILL -- "-$debugger_group" 2> /dev/null || true
    wait "$debugger_group" 2> /dev/null || true
  fi
  rm -f "$core_dir"/core.* "$core_dir/gdb-output.txt" || true
  rmdir "$core_dir" 2> /dev/null || true
  if [ -s "$out_dir/host-core-pattern.txt" ]; then
    sudo -n tee /proc/sys/kernel/core_pattern < "$out_dir/host-core-pattern.txt" > /dev/null 2>&1 || true
    cat /proc/sys/kernel/core_pattern > "$out_dir/host-core-pattern-after.txt" 2> /dev/null || true
  fi
}

main "$@"
