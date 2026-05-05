---
'@portabletext/markdown': minor
---

feat: support GFM task lists in markdown round-trip

`markdownToPortableText` now recognizes GitHub-Flavored Markdown task list items (`- [ ] foo` and `- [x] foo`) and converts them into Portable Text blocks with `listItem: 'task'` and a boolean `checked` field. `portableTextToMarkdown` renders these blocks back to the same syntax. The default schema declares the `task` list type and a `checked` block field, so consumers using the default schema get round-tripping for free. Schemas without a `task` list type fall back to `bullet` and discard the checkbox prefix.
