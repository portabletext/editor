---
'@portabletext/editor': patch
---

fix: keep the drag source when a drop fits no blocks

Dropping blocks that the destination rejects entirely (a table cell whose schema accepts none of them, for example) deleted the drag source with nothing inserted. That drop is now a no-op.
