---
'@portabletext/sanity-bridge': patch
---

fix: fail with a diagnostic on schemas too large to convert

`sanitySchemaToPortableTextSchema` throws an error naming the shared types responsible when a schema's expanded form would exceed 50 million nodes, instead of freezing Studio. Smaller schemas convert exactly as before.
