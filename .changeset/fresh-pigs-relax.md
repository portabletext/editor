---
'@portabletext/editor': patch
---

fix(`block.set`): validate `marDefs`

Adding `markDefs` to a text block using `block.set` now validates the `markDefs` against the schema to make sure only known annotations are added.
