---
'@portabletext/plugin-sdk-value': patch
---

fix: stop dropping mutation flushes and stomping in-flight typing during sync

A single user typing (especially deleting and retyping) could see text
reordered, duplicated, or resurrected. Two sync-machine bugs compounded:
mutation flush events arriving in bursts were silently dropped by states
without a handler, permanently diverging the store from the editor, and the
whole-value repair ran while local edits were still in flight, diffing the
editor against the lagging store and injecting stale text back into it.

Every state now pushes mutation flushes, and the whole-value repair only
runs when the editor is quiescent (on a store change while idle, plus a
one-shot repair after a short idle delay).
