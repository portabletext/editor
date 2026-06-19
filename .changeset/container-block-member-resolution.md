---
'@portabletext/sanity-bridge': patch
---

fix: resolve container block members from their own schema in `sanitySchemaToPortableTextSchema`

A container block member now resolves its sub-schema from its own declared styles, decorators, annotations, lists, and inline objects. A code-block line that declares `of: []` no longer inherits the root block's inline objects, and a container that declares a same-named but differently-shaped annotation or inline object (e.g. a `widget` whose fields differ from the root's `widget`) keeps its own shape instead of the root's.
