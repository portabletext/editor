---
'@portabletext/editor': patch
---

fix: move the selection out of a node removed by an index path

An `unset` patch that addresses a node by index, such as `[{_key: 'b1'}, 'children', 1]`, now moves the selection out of the removed node the same way a keyed path does. Previously the selection kept pointing at the removed node, so the next keystroke was lost.
