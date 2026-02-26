---
'@portabletext/editor': patch
---

fix: catch DOM errors in `restoreDOM` on Android

`RestoreDOMManager.restoreDOM()` can throw when the DOM has been modified by a React render (e.g., `rangeDecoration` updates) between the original mutation and the restore attempt. This is expected on Android where the IME mutates the DOM before JavaScript can intercept. The editor self-heals on the next render cycle, so these errors are safe to suppress.

Fixes #2257
