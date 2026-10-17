---
'@portabletext/editor': patch
---

fix: look up a block object's schema type in the sub-schema at its path

A block object that the schema declares only inside a container's array field, and not at the top level, no longer logs `Unable to find Block Object "<type>" in Schema` when it renders.
