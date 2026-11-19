#!/usr/bin/env bash
# Boot an iPhone simulator with the software keyboard and language preferences.
#
# Usage: .github/scripts/thumbjar-ios-setup.sh <en|ja> <out>. Writes UDID and IOS_VERSION to $GITHUB_ENV.
set -euo pipefail
# Bound every device command: simctl and the Simulator launch can hang on a broken runner.
# Boot and bootstatus get 900 s because the first boot on hosted macOS runners has taken up to 330 s.
bounded() { /usr/bin/perl -e 'my $seconds = shift; alarm $seconds; exec @ARGV; die "exec: $!";' "$@"; }
xcrun() { bounded 300 /usr/bin/xcrun "$@"; }
xcrun_boot() { bounded 900 /usr/bin/xcrun "$@"; }
defaults() { bounded 30 /usr/bin/defaults "$@"; }
lang=$1; out=$2; mkdir -p "$out"
rt=$(xcrun simctl list runtimes available -j | jq -r '[.runtimes[]|select(.platform=="iOS")]|sort_by(.version|split(".")|map(tonumber))|last|.identifier')
ver=$(xcrun simctl list runtimes available -j | jq -r --arg rt "$rt" '.runtimes[]|select(.identifier==$rt)|.version')
udid=$(xcrun simctl list devices available -j | jq -r --arg rt "$rt" '[.devices[$rt][]|select(.name|test("^iPhone"))][0].udid // empty')
[ -n "$udid" ] || { echo "No available iPhone simulator" >&2; exit 1; }
name=$(xcrun simctl list devices available -j | jq -r --arg rt "$rt" --arg u "$udid" '.devices[$rt][]|select(.udid==$u)|.name')
echo "SIM runtime=$rt version=$ver device=$name udid=$udid" | tee "$out/sim.txt"
echo "UDID=$udid" >> "$GITHUB_ENV"
echo "IOS_VERSION=$ver" >> "$GITHUB_ENV"
# No hardware keyboard: the Simulator app reads this when it attaches.
defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false
defaults write com.apple.iphonesimulator DevicePreferences -dict-add "$udid" '<dict><key>ConnectHardwareKeyboard</key><false/></dict>'
defaults read com.apple.iphonesimulator | tee -a "$out/sim.txt"
xcrun_boot simctl boot "$udid"
xcrun_boot simctl bootstatus "$udid" -b > /dev/null
sp() { xcrun simctl spawn "$udid" "$@"; }
if [ "$lang" = ja ]; then
  sp defaults write -g AppleKeyboards -array 'ja_JP-Romaji@sw=QWERTY-Japanese;hw=Automatic' 'en_US@sw=QWERTY;hw=Automatic'
else
  sp defaults write -g AppleKeyboards -array 'en_US@sw=QWERTY;hw=Automatic'
fi
sp defaults write -g AppleKeyboardsExpanded -int 1
for k in KeyboardAutocorrection KeyboardPrediction KeyboardAutocapitalization KeyboardCheckSpelling DidShowContinuousPathIntroduction KeyboardDidShowProductivityTutorial; do
  sp defaults write com.apple.Preferences "$k" -bool true
  sp defaults write com.apple.keyboard.preferences "$k" -bool true
done
sp defaults write com.apple.Preferences KeyboardContinuousPathEnabled -bool false
sp defaults read -g AppleKeyboards | tee -a "$out/sim.txt"
sp defaults read com.apple.Preferences | tee "$out/preferences.txt" > /dev/null
# Reboot so keyboard daemons pick the preferences up.
xcrun simctl shutdown "$udid"
xcrun_boot simctl boot "$udid"
xcrun_boot simctl bootstatus "$udid" -b > /dev/null
# Appium restarts a booted device unless this exact Simulator.app is running.
sim_app="$(bounded 10 /usr/bin/xcode-select -p)/Applications/Simulator.app"
bounded 30 /usr/bin/open -a "$sim_app" --args -CurrentDeviceUDID "$udid"
for ((attempt = 1; attempt <= 60; attempt++)); do
  if pgrep -f "$sim_app" > /dev/null; then break; fi
  sleep 1
done
pgrep -fl "$sim_app" | tee -a "$out/sim.txt" || { echo "Simulator.app did not start within 60 s: $sim_app" >&2; exit 1; }
echo "SIM booted at $(date +%s)" | tee -a "$out/sim.txt"
