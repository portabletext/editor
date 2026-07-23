---
'@portabletext/editor': patch
---

fix: materialize missing `style`/`marks`/`markDefs` defaults without emitting patches

The editor no longer writes default values for missing `style`, `marks`, or `markDefs` fields back to the document. These fields are optional in Portable Text with universal read-side defaults (renderers already default them), so the editor keeps its in-memory defaults and the document stays byte-identical to what its author wrote.

Consumers will no longer see `set` patches for these fields ride out with the first edit after opening a document that lacks them. Whole-block emissions (for example inserting a block) still carry the materialized fields inside the block they insert, and repairs that other patches depend on (`_key` mints, `text`) are unaffected.
