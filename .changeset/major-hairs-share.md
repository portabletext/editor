---
"@portabletext/editor": minor
---

feat: add unified input handling across desktop and mobile

Previously, Android used a separate input pipeline that assumed all browser
input events were non-cancelable, requiring expensive DOM reconciliation for
every keystroke. Most Android input events are in faccancelable - only IME
composition is not. The new hybrid input manager intercepts events directly
where possible and falls back to a ProseMirror-inspired DOM parse-and-diff path
for composition. This fixes autocorrect on Android and gives behavior authors a
single code path that works on all platforms.
