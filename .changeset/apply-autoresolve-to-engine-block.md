---
'@portabletext/editor': patch
---

fix: apply value-sync auto-resolutions to the block the engine receives

When an `update value` carried a block the editor could repair
automatically (a child missing its `_key`, an empty `children` array,
unused `markDefs`), the repair was emitted as patches while the raw,
un-repaired block proceeded into the editor. The editor then held an
invalid shape that diverged from the document: the emitted patch minted
one key, internal normalization minted another. The repair is now
applied to the block before it enters the editor, so the emitted patch
and the editor state agree, and the editor never holds the un-repaired
shape.
