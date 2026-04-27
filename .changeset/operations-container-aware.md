---
'@portabletext/editor': patch
---

fix: make operations container-aware

Every block-level and annotation-level operation (`block.set`,
`block.unset`, `child.set`, `decorator.add`, `decorator.remove`,
`annotation.add`, `annotation.remove`, `delete`, `insert.block`,
`insert.child`, `move.block`) now resolves paths at any depth and
honors each block's sub-schema. `decorator.add` and `annotation.add`
no longer silently apply marks that the current sub-schema doesn't
declare. Range deletes that span multiple containers preserve each
container's structure.
