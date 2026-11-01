#!/usr/bin/env bash
# Prepares a booted emulator for `typeOnDevice`. `thumbjar prepare` runs it with THUMBJAR_KEYBOARD,
# THUMBJAR_OUT_DIR, THUMBJAR_PAGE_URL and THUMBJAR_PAGE_PORT set, the port from the driver's `localhostPort`
# and empty when the page is not on localhost. A prep step that breaks exits with a PREP FAILED line naming
# the step.
# The whole prep runs under `timeout -k 10 600`, so it ends within 610 seconds however the device hangs.
set -u
lang=$THUMBJAR_KEYBOARD
out=$THUMBJAR_OUT_DIR
page_url=$THUMBJAR_PAGE_URL
port=$THUMBJAR_PAGE_PORT
here=$(cd "$(dirname "$0")" && pwd)
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
  timeout -k 5 60 "$here/diagnose.sh" "$out" || log "diagnose rc=$?"

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
    timeout -k 10 240 node "$here/setup-ja.ts" "$out" 2>&1 | tee -a "$out/ja-setup.log"
    rc=${PIPESTATUS[0]}
    log "japanese setup rc=$rc"
    [ "$rc" -eq 0 ] || fail "japanese setup, see ja-setup.log"
  fi

  log "logcat"
  a logcat -c
  curl -sf --max-time 5 --retry 5 --retry-connrefused --retry-delay 1 -o /dev/null "$page_url" || fail "http server, see http.log"
  log "http ok"
  if [ -n "$port" ]; then
    a reverse "tcp:$port" "tcp:$port" || fail "adb reverse"
    a reverse --list
  fi
}

# One deadline for the whole prep. `prep` runs in a subshell, so its `fail` exits only the subshell.
export -f prep log a fail
export lang out page_url port here
timeout -k 10 600 bash -c prep
rc=$?
[ $rc -eq 124 ] && log "PREP FAILED: prep ran past 600s"
[ $rc -eq 0 ] || exit 1
