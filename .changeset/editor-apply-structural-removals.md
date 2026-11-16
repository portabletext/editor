---
'@portabletext/editor': patch
---

fix: apply removals from structural corrections

A non-empty string, a non-zero number, `true` or an array arriving as an entry by a collaborator's insert, `update value` or a start value (anywhere but its first root entry) is now removed and one `unset` patch is emitted, at the root, in a text block's children and in a top-level container's field. Previously it became a block holding the entry's characters or items as fields. `null`, `false`, `0` and `''` entries are not changed.
