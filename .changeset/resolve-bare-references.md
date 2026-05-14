---
'@portabletext/editor': minor
---

feat: resolve bare type references with cycle detection

The schema resolver now follows bare `{type: 'X'}` references in container fields by looking up `X` in the ancestor walk chain first, then in `schema.blockObjects`. This means types declared inline by an ancestor are referenceable from descendants. That's necessary for self-referential schemas where the recursive type isn't at the schema root (e.g. a `list` declared inline inside a `callout`, with `list-item.content` referencing `list` again).

Walks recursive schemas with ancestor-name cycle detection: walks one level past a self-reference and stops, so registrations like `defineContainer({type: 'list-item', childField: 'content', of: [{type: 'list', ...}]})` resolve without infinite candidate emission.

Inline declarations use `{type: 'object', name: 'X', fields: [...]}` (Sanity-aligned).
