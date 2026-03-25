---
'@portabletext/editor': patch
---

fix: add proper internal check for leaf nodes

Add an `isLeaf` predicate that correctly distinguishes between nodes that cannot have children and nodes that currently have no children. This replaces ad-hoc `isSpan || isObjectNode` checks in operations with a proper leaf node check that is aware of editable containers.
