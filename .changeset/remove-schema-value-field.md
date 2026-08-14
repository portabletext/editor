---
'@portabletext/schema': major
'@portabletext/editor': major
'@portabletext/sanity-bridge': major
---

feat!: remove the deprecated `value` field from compiled schema types

Compiled style, list, and decorator objects no longer carry the `value` mirror of `name`. Read `name` instead. This is observable to editor consumers reading `snapshot.context.schema`. `@portabletext/sanity-bridge` stops emitting the mirror into the schema definitions it builds in the same motion.
