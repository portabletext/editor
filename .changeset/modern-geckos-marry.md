---
'@portabletext/editor': patch
---

fix: drag and drop performance issue with long documents

Refactored drop indicator state management from per-block Behaviors to editor-level Behaviors. Previously, each block registered its own drag Behaviors, causing O(N) Behavior evaluations and state updates per drag event. Now there are only 2 Behaviors regardless of document size, eliminating the performance bottleneck when dragging blocks in long documents.
