---
'@portabletext/markdown': minor
---

feat: support per-column alignment on tables

The default `table` block-object now carries an optional `alignment` field that mirrors GFM's per-column alignment markers. `markdownToPortableText` reads the colons on the delimiter row (`:---`, `:---:`, `---:`) and writes them to `alignment` as an array of `'left' | 'center' | 'right' | null`, indexed by column. `portableTextToMarkdown` does the inverse: a `null` (or missing) entry emits `---`, otherwise the entry decides which colons surround the dashes. Tables without alignment round-trip unchanged - the `alignment` field is omitted on the way in and skipped on the way out.
