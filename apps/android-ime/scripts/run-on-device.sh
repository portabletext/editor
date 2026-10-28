#!/usr/bin/env bash
# Runs inside android-emulator-runner's script block, emulator already booted.
# Prepares the device for the driver. A prep step that breaks exits with a PREP FAILED line naming
# the step.
# Every stage runs under `timeout -k`, so a hang shows up as a logged timeout and the stage ends within
# its cap plus the kill-after: prep 600 + 10 seconds, the diagnostics after it 60 + 5.
set -u
lang=${IME_LANG:-en}
out=out
mkdir -p "$out"
log() { echo "PHASE $(date +%H:%M:%S) $*" | tee -a "$out/phases.log"; }
a() { timeout -k 5 60 adb "$@"; local rc=$?; [ $rc -eq 124 ] && log "TIMEOUT adb $*"; return $rc; }
fail() { log "PREP FAILED: $*"; exit 1; }

prep() {
  # Play services runs a startup storm after boot. Chrome depends on its font provider and gets killed
  # when it ANRs, so wait until the system has been free of ANRs for 30s. No iteration starts after 240s,
  # so the settle ends within about 285s, and the prep deadline bounds it in any case.
  # Late ANRs (system, launcher) still pop a dialog that takes window focus. Suppress the dialogs.
  a shell settings put global hide_error_dialogs 1 || fail "hide error dialogs"
  log "settle start"
  quiet=0
  settle_start=$SECONDS
  while [ $((SECONDS - settle_start)) -lt 240 ]; do
    if timeout -k 5 20 adb logcat -d -b events 2>/dev/null | grep -q "am_anr"; then quiet=0; timeout -k 5 10 adb logcat -b events -c; else quiet=$((quiet + 5)); fi
    [ $quiet -ge 30 ] && break
    sleep 5
  done
  log "settle done after $((SECONDS - settle_start))s quiet=$quiet"
  log "diagnose start"
  timeout -k 5 60 scripts/diagnose.sh "$out" || log "diagnose rc=$?"

  # Make Chrome skip its first-run screens. Non-root Chrome reads this file only when it is the debug app.
  log "chrome flags"
  a shell am set-debug-app --persistent com.android.chrome || fail "chrome debug app"
  a shell 'echo "_ --disable-fre --no-default-browser-check --no-first-run --disable-features=SigninPromo" > /data/local/tmp/chrome-command-line' || fail "chrome command line"
  a shell cat /data/local/tmp/chrome-command-line

  log "soft keyboard"
  a shell settings put secure show_ime_with_hard_keyboard 1 || fail "soft keyboard"
  a shell settings get secure show_ime_with_hard_keyboard

  if [ "$lang" = ja ]; then
    log "japanese setup"
    timeout -k 10 240 node scripts/setup-ja.ts "$out" 2>&1 | tee -a "$out/ja-setup.log"
    rc=${PIPESTATUS[0]}
    log "japanese setup rc=$rc"
    [ "$rc" -eq 0 ] || fail "japanese setup, see ja-setup.log"
  fi

  log "logcat"
  a logcat -c
  curl -sf --max-time 5 --retry 5 --retry-connrefused --retry-delay 1 -o /dev/null http://localhost:8765/editor.html || fail "http server, see http.log"
  log "http ok"
  a reverse tcp:8765 tcp:8765 || fail "adb reverse"
  a reverse --list
}

echo "BOOTED at $(date +%s)" | tee -a "$out/timing.txt"
log "http server"
node scripts/serve.ts dist 8765 < /dev/null > "$out/http.log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT

# One deadline for the whole prep. `prep` runs in a subshell, so its `fail` exits only the subshell.
export -f prep log a fail
export lang out
timeout -k 10 600 bash -c prep
rc=$?
[ $rc -eq 124 ] && log "PREP FAILED: prep ran past 600s"
[ $rc -eq 0 ] || exit 1

(timeout -k 5 1800 adb logcat -v time > "$out/logcat.txt" 2>&1 &)

timeout -k 5 60 bash -c '
  adb logcat -d -b crash > "$1/logcat-crash.txt"
  adb shell dumpsys activity exit-info com.android.chrome > "$1/chrome-exit-info.txt"
  adb exec-out screencap -p > "$1/final.png"
' _ "$out" || log "diagnostics rc=$?"
echo "DONE at $(date +%s)" | tee -a "$out/timing.txt"
