---
'@portabletext/toolbar': patch
---

fix(perf): coalesce toolbar editor listeners with `schedule: 'microtask'`

Toolbar buttons no longer freeze the editor while recomputing their active
state during large edits. Each button listened for every editor event and
recomputed its active state by scanning the selection, so deleting or changing
a big selection recomputed every button once per underlying operation. The
listeners now pass `{schedule: 'microtask'}` to `editor.on`, so a burst of
events coalesces into a single recompute over the settled state.
