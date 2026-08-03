---
'@portabletext/editor': patch
---

fix: run `markDef` and empty-span-annotation cleanup only as fallout of local edits

Unused and duplicate `markDefs`, and annotations on empty spans, are no longer cleaned up while adopting outside content or applying a collaborator's patches: adopted blocks keep those shapes exactly as the document has them. A local edit touching the block still cleans them up, emitted as part of that edit. Note that unused `markDefs` arriving via `initialValue` or `update value` are still pruned at ingress by value validation.
