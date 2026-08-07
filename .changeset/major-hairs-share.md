---
"@portabletext/editor": minor
---

feat: add unified input handling across desktop and mobile

Previously, Android used a separate input pipeline that assumed all browser
input events were non-cancelable, requiring expensive DOM reconciliation for
every keystroke. Most Android input events are in fact cancelable; only IME
composition is not. The new hybrid input manager intercepts events directly
where possible and falls back to a ProseMirror-inspired DOM parse-and-diff path
for composition. This fixes autocorrect on Android and gives behavior authors a
single code path that works on all platforms.

It also removes a class of desktop DOM corruption: because cancelable input no
longer mutates the DOM ahead of the model, typing immediately after toggling a
decorator (for example bold) at a collapsed cursor no longer leaves a stray
"ghost" copy of the character in the editor. The rendered text now always
matches the document.
