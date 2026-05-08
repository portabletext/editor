---
'@portabletext/markdown': minor
---

feat: add `types.list` matcher to `markdownToPortableText` for list-as-container

Lets consumers take ownership of structural list emission on the way in, mirroring the existing `types.table` pattern. When a `types.list` matcher is provided, list tokens become `{_type: 'list', kind, items: [...]}` block-objects whose `list-item.content` arrays can hold any block — text blocks, code blocks, callouts, images, even nested lists. The default flat path (text blocks with `listItem` and `level` fields) is unchanged for consumers who don't register the matcher.

Pair with `defineContainer({scope: '$..list', field: 'items'})` and `defineContainer({scope: '$..list-item', field: 'content'})` in PTE v7 to get list items that hold rich content.
