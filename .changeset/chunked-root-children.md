---
'@portabletext/editor': patch
---

fix(perf): render the root block list in memoized chunks

Typing and editing in large documents no longer pays a React
reconciliation cost proportional to the total block count. The root
block list now renders in contiguous chunks whose components skip
re-rendering unless one of their own blocks changed, so a keystroke
rebuilds and reconciles one chunk instead of the whole document. The
rendered DOM is unchanged, chunks render as fragments.
