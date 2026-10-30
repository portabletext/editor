---
'@portabletext/markdown': patch
---

fix: render a hard break after an empty line as a backslash break when the document parses back unchanged

A paragraph, blockquote or list item with an empty line inside it (two or more consecutive newlines in its text, as typed with Shift+Enter twice) now comes back from Markdown as one block. Previously the empty line rendered as a whitespace-only line, which Markdown reads as a paragraph break, so the block came back as two and `applyMarkdownEdit` skipped key matching:

```ts
const blocks = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's1', text: 'foo\n\nbar', marks: []}],
  },
]

portableTextToMarkdown(blocks)
// 'foo  \n\\\nbar', previously 'foo  \n  \nbar'

applyMarkdownEdit(blocks, portableTextToMarkdown(blocks))
// Keeps `b1` and `s1`. Previously reported `round-trip-mismatch` and minted new keys
```

The backslash form is used only when the whole document still parses back with that block exactly as it was and every other block as before. Otherwise the output is unchanged. Headings, nested list items and documents rendered with a custom `hardBreak` or a custom `blockSpacing` keep their current output.
