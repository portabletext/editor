#!/usr/bin/env bash
# Appends one line to <out-file> every HOST_SAMPLER_INTERVAL seconds: the epoch, MemAvailable and SwapFree
# in kB, the one-minute load and the emulator process, or `qemu=none`. The emulator is the first process
# whose command line matches HOST_SAMPLER_PATTERN. When a process seen before is gone, one
# `QEMU_GONE pid=<pid> at <epoch>` line follows. Nothing here fails the script, so a sample that cannot be
# read is left out.

out_file="${1:-}"
if [ -z "$out_file" ]; then
  echo "usage: host-sampler.sh <out-file>" >&2
  exit 2
fi

interval="${HOST_SAMPLER_INTERVAL:-2}"
pattern="${HOST_SAMPLER_PATTERN:-qemu-system-x86_64}"
out_dir="$(dirname "$out_file")"
mkdir -p "$out_dir" || true
echo "$$" > "$out_dir/host-sampler.pid" || true

self="$BASHPID"
last_pid=""

while true; do
  now="$(date +%s)"
  mem_available="$(grep -m1 '^MemAvailable:' /proc/meminfo 2> /dev/null | awk '{print $2}')"
  swap_free="$(grep -m1 '^SwapFree:' /proc/meminfo 2> /dev/null | awk '{print $2}')"
  load="$(cut -d' ' -f1 /proc/loadavg 2> /dev/null)"

  current_pid=""
  for candidate in $(pgrep -f "$pattern" 2> /dev/null); do
    if [ "$candidate" != "$$" ] && [ "$candidate" != "$self" ] && [ "$candidate" != "$PPID" ]; then
      current_pid="$candidate"
      break
    fi
  done

  # A zombie has exited, so only a live state counts as alive.
  state=""
  if [ -r "/proc/$current_pid/stat" ]; then
    stat="$(cat "/proc/$current_pid/stat" 2> /dev/null)"
    rest="${stat##*) }"
    state="${rest%% *}"
  fi
  if [ -n "$current_pid" ] && [ -n "$state" ] && [ "$state" != "Z" ]; then
    rss="$(grep -m1 '^VmRSS:' "/proc/$current_pid/status" 2> /dev/null | awk '{print $2}')"
    qemu="qemu pid=$current_pid rss_kb=${rss:-0} state=$state"
  else
    qemu="qemu=none"
  fi
  echo "$now ${mem_available:-0} ${swap_free:-0} ${load:-0} $qemu" >> "$out_file" || true

  if [ -n "$last_pid" ]; then
    last_state=""
    if [ -r "/proc/$last_pid/stat" ]; then
      last_stat="$(cat "/proc/$last_pid/stat" 2> /dev/null)"
      last_rest="${last_stat##*) }"
      last_state="${last_rest%% *}"
    fi
    if [ -z "$last_state" ] || [ "$last_state" = "Z" ]; then
      echo "QEMU_GONE pid=$last_pid at $(date +%s)" >> "$out_file" || true
      last_pid=""
    fi
  fi
  if [ -z "$last_pid" ] && [ -n "$current_pid" ] && [ "$qemu" != "qemu=none" ]; then
    last_pid="$current_pid"
  fi

  sleep "$interval" || true
done
