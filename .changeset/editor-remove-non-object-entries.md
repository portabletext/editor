---
'@portabletext/editor': patch
---

fix: remove non-object entries at any depth

A `null`, string, number, boolean or array entry that a collaborator's patch puts in the value is now removed, at the root, in a text block's children and annotations, and in container fields at any depth. Such entries in a start value are removed too, except at the root. Each removal emits an `unset` patch that addresses the entry by index, so the host's copy stays equal to the editor's. Before, these entries could crash the editor or stay in the host's copy.

Node lookups such as `getNode` now return nothing for a non-object entry, and traversal skips it.
