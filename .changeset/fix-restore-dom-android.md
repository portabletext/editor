---
'@portabletext/editor': patch
---

fix: prevent Android crash when `rangeDecorations` change during input

`RestoreDOMManager` can crash on Android when the DOM has been restructured by React (e.g., `rangeDecoration` wrapper elements added/removed) between the original IME mutation and the restore attempt.

Two fixes:

1. Wrap `insertBefore` and `removeChild` in `restoreDOM()` with try-catch so individual node restorations can fail gracefully.
2. Wrap `getSnapshotBeforeUpdate` in `RestoreDOMComponent` with try-catch so any unexpected error during the restore phase doesn't crash the React tree.

In both cases, the editor self-heals on the next render cycle.

Fixes #2257
