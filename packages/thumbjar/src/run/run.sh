#!/usr/bin/env bash
set -u
file=$1
lang=$2
page_dir=$3
config=$4
project=$5
port=$6
out=$7
mkdir -p "$out"
log() { echo "PHASE $(date +%H:%M:%S) $*" | tee -a "$out/phases.log"; }
skipped() { echo "CHECKED skipped at $(date +%s)" >> "$out/timing.txt"; }
fail() { log "PREP FAILED: $*"; skipped; exit 1; }
device_check() { log "device check: $(timeout -k 5 10 node "$THUMBJAR_RUN_CHECK" "$out/timing.txt" || echo unchecked)"; }

booted=$(date +%s)
echo "BOOTED at $booted" | tee -a "$out/timing.txt"
tests_seconds=$(timeout -k 5 10 node "$THUMBJAR_RUN_CAP" "$page_dir/../$file")
[[ $tests_seconds =~ ^[0-9]+$ ]] || fail "read the test stage timeout for $file"
log "http server"
pnpm exec thumbjar serve "$page_dir" --port "$port" < /dev/null > "$out/http.log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT

earlier_phases=$(cat "$out/phases.log" 2>/dev/null | wc -l)
pnpm exec thumbjar prepare --keyboard "$lang" --page-url "http://localhost:$port/editor.html" --out-dir "$out" --booted "$booted"
prep_status=$?
if [ "$prep_status" -ne 0 ]; then
  # The prep's own reason, for the job summary. A retry's `phases.log` still holds the earlier boot's
  # lines, so only the lines this prep appended count. The retry keys on the prep's status, never on the
  # reason, and only together with the device check below.
  reason=$(tail -n +$((earlier_phases + 1)) "$out/phases.log" 2>/dev/null | grep -o 'PREP FAILED: .*' | tail -n 1)
  [ -n "$reason" ] && echo "$reason" >> "$out/timing.txt"
  [ "$prep_status" -eq 3 ] && echo "PREP DICTIONARY_NOT_LOADED" >> "$out/timing.txt"
  device_check
  exit 1
fi

if [ "$file" = 'tests/testime.en.test.ts' ]; then
  gboard=$(adb shell settings get secure default_input_method | tr -d '\r')
  cleanup_test_ime() {
    adb shell ime set "$gboard"
    kill "$server" 2>/dev/null
  }
  trap cleanup_test_ime EXIT
  adb install -r "${THUMBJAR_TEST_IME_APK:?test IME APK missing}" || fail "install test IME"
  # The package manager registers a fresh install a moment after `adb install` returns.
  for attempt in 1 2 3 4 5 6 7 8 9 10; do adb shell ime enable org.slatejs.testime/.TestIme && break; sleep 1; done
  adb shell ime list -s | grep -q org.slatejs.testime || fail "enable test IME"
  adb shell ime set org.slatejs.testime/.TestIme || fail "select test IME"
fi

# Records through the test stage, its kill-after, the device check and the diagnostics after it.
(timeout -k 5 $((tests_seconds + 10 + 15 + 65)) adb logcat -v time > "$out/logcat.txt" 2>&1 &)

log "tests start, $file under $tests_seconds seconds"
timeout -k 10 "$tests_seconds" pnpm exec vitest run --config "$config" --project "$project" "$file" < /dev/null 2>&1 | tee -a "$out/vitest.log"
status=${PIPESTATUS[0]}
log "tests rc=$status"
if [ "$status" -eq 0 ]; then skipped; else device_check; fi

timeout -k 5 60 bash -c '
  adb logcat -d -b crash > "$1/logcat-crash.txt"
  adb shell dumpsys activity exit-info com.android.chrome > "$1/chrome-exit-info.txt"
  adb exec-out screencap -p > "$1/final.png"
' _ "$out" || log "diagnostics after the tests rc=$?"
echo "DONE at $(date +%s)" | tee -a "$out/timing.txt"
exit $status
