---
"@portabletext/editor": minor
---

feat: use keyed paths internally

The editor now uses key-based paths internally instead of positional
indices. Nodes are identified by their `_key` rather than their position
in the tree, making paths stable across concurrent edits. This is a
prerequisite for nested editable containers (tables, callouts) and
aligns the editor's internal model with the Sanity patch protocol.

No changes to the public API.
