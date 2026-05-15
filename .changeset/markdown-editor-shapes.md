---
'@portabletext/markdown': minor
---

feat: expose editor-shape matcher builders and structural defaults

Adds matcher helpers and exports needed to round-trip markdown through a Portable Text editor where containers like `code-block` and `table` use editor-friendly shapes (per-line text blocks, `content` field names) instead of the parser's internal shapes.

New matcher helpers:

- `buildCodeBlockObjectMatcher(definition)` - splits the parser's `code: string` source into an array of text blocks (one per line) under the definition's non-`language` field.
- `buildTableObjectMatcher(definition)` - renames each `cells[i].value` to `cells[i].content`, symmetric with the other container shapes (`callout.content`, `blockquote.content`, `list-item.content`).

New exports (previously internal):

- `defaultBlockquoteObjectDefinition`, `defaultListObjectDefinition`, `defaultTableObjectDefinition`, `defaultCodeBlockObjectDefinition`, `buildObjectMatcher` - block-object definitions and the generic matcher builder, so consumers can register containers without redeclaring shapes.

`DefaultTableRenderer` now reads `cells[i].content` first and falls back to `cells[i].value`, accepting both the editor shape and the legacy shape without a breaking change.
