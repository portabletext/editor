---
'@portabletext/sanity-bridge': patch
---

fix: harden schema compilation against built-in name collisions and restore inline object type names

Adds `file`, `slug`, and `geopoint` to the set of Sanity built-in names that need temporary names during `SanitySchema.compile()`. Without this, schemas using these names as block or inline objects get extra fields injected by the Sanity schema compiler.

Fixes inline object `type.name` restoration for shared and built-in names. Previously only `inlineObject.name` was restored from the temporary name, leaving `inlineObject.type.name` with the `tmp-` prefix.

Simplifies the name restoration pass to mutate shared references directly instead of mapping over `portableText.of` separately.
