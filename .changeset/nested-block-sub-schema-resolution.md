---
'@portabletext/schema': minor
---

feat: resolve nested block sub-schemas at compile time

A nested block declaration (e.g. a callout's text block, a code-block's line, a table cell's content) inherits the surrounding schema's decorators, annotations, styles, and lists by default. Inline overrides on the nested block (e.g. a code-block line declaring an empty `decorators: []` so bold doesn't apply inside code) are now resolved when the schema compiles, so every consumer of the schema sees the final per-position rules without having to walk the tree at runtime.
