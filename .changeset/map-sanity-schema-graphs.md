---
'@portabletext/sanity-bridge': major
---

feat: map compiled Sanity schemas to definition graphs

`sanitySchemaToPortableTextSchema` and `sanitySchemaDefinitionToPortableTextSchema` now return one definition object per distinct Sanity type, shared by every position that embeds it. A recursive type is a cycle in the returned schema, so the output of a recursive schema is no longer JSON-serializable.

Recursive schemas no longer end in bare `{type: name}` references or inline objects and annotations with empty `fields`: every position keeps the full fields at any depth. The compact form that schemas exceeding 100,000 expansions converted to is removed with its budget, along with the positions in it that lost their fields. Nested blocks always list their own annotations and inline objects instead of leaving out the ones that match the root.
