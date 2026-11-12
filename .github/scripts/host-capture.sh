#!/usr/bin/env bash
# Stops the host sampler that `<out-dir>/host-sampler.pid` names and writes the host's own record next to
# its log: the kernel log, disk and memory, and the emulator's crash data. Every command is allowed to
# fail and the script always exits 0, so a capture never turns a job red.

out_dir="${1:-}"
if [ -z "$out_dir" ]; then
  echo "usage: host-capture.sh <out-dir>" >&2
  exit 0
fi
mkdir -p "$out_dir" || true

sampler_pid="$(cat "$out_dir/host-sampler.pid" 2> /dev/null)"
runs_sampler=false
if [ -n "$sampler_pid" ]; then
  # A pid file left behind could name an unrelated process now, so only a process one of whose arguments is
  # the sampler script itself is stopped.
  while IFS= read -r -d '' argument; do
    if [ "${argument##*/}" = "host-sampler.sh" ]; then
      runs_sampler=true
    fi
  done 2> /dev/null < "/proc/$sampler_pid/cmdline" || true
fi
if [ "$runs_sampler" = true ]; then
  kill "$sampler_pid" 2> /dev/null || true
fi

timeout 10 bash -c "${HOST_DMESG_CMD:-sudo dmesg -T}" > "$out_dir/host-dmesg.txt" 2>&1 || true
timeout 10 df -h > "$out_dir/host-disk.txt" 2>&1 || true
{
  timeout 10 free -m
  timeout 10 cat /proc/meminfo
} > "$out_dir/host-memory.txt" 2>&1 || true

# The glob is left unquoted so it expands to the crash database of each emulator run.
for crash in ${HOST_CRASH_GLOB:-/tmp/android-*/emu-crash-*}; do
  if [ -e "$crash" ]; then
    mkdir -p "$out_dir/emu-crash" || true
    timeout 10 cp -r "$crash" "$out_dir/emu-crash/" || true
  fi
done

exit 0
