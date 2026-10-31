#!/usr/bin/env bash
# Device facts for the report. Never fails the job.
set -u
out=${1:-out}
mkdir -p "$out"
{
  echo "== build"; adb shell getprop ro.build.fingerprint; adb shell getprop ro.build.version.sdk
  echo "== locale"; adb shell getprop persist.sys.locale; adb shell settings get system system_locales
  echo "== ime list -s"; adb shell ime list -s
  echo "== default_input_method"; adb shell settings get secure default_input_method
  echo "== enabled_input_methods"; adb shell settings get secure enabled_input_methods
  echo "== gboard"; adb shell dumpsys package com.google.android.inputmethod.latin | grep -E 'versionName|versionCode' | head -2
  echo "== chrome"; adb shell dumpsys package com.android.chrome | grep -E 'versionName' | head -1
  echo "== gboard subtypes"; adb shell dumpsys input_method | grep -iE 'subtype|mCurrentSubtype|ja' | head -40
  echo "== adb root"; adb root 2>&1 | head -1
} 2>&1 | tee "$out/diagnose.txt"
