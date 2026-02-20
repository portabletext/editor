---
'@portabletext/editor': patch
---

fix: preserve selection when applying whole-block set patches

When a remote `set` patch targets a whole text block (path length 1),
the previous code removed all children and re-inserted them even when
children were unchanged. This destroyed the user's selection.

Now compares children by `_key` before and after. When keys match
(same children, same order), updates individual children that differ
instead of the remove/insert cycle. When keys differ, falls back to
remove/insert but validates selection paths before restoring.
