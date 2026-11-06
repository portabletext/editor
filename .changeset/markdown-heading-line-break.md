---
'@portabletext/markdown': patch
---

fix: write a heading whose text holds a line break as a paragraph instead of splitting it

Markdown has no multi-line `#` heading, so `portableTextToMarkdown` used to split such a heading into a heading and a paragraph that read back as two blocks:

```ts
portableTextToMarkdown([
  {
    _type: 'block',
    _key: 'b1',
    style: 'h3',
    markDefs: [],
    children: [{_type: 'span', _key: 's1', text: 'foo\nbar', marks: []}],
  },
])
// Previously returned: '### foo  \nbar'
// Now returns: 'foo  \nbar'
```

The block is now written as a paragraph with its text intact, and the dropped style is reported to `onDegradation` as a `style-fallback`. This applies at any depth, including inside callouts and `types.blockquote` objects, and also when the line break comes from a link title, image text or a custom mark renderer. An `h1` or `h2` at the top level is still written as a setext heading (`foo  \nbar\n===`) where that reads back intact, and is then not reported. A custom `block` renderer for the style, or a custom `hardBreak` that renders no line break, keeps the heading as before.

When `portableTextToMarkdown` writes a block as a setext heading, or writes an empty line in a block with a backslash break, `onDegradation` now reports the losses of that form, and so do the `hiddenLosses` that `applyMarkdownEdit` passes to `onReconciliation`. They used to report the losses of the form it did not write, which differ when a custom renderer reaches different content in each form.

`applyMarkdownEdit` now keeps the keys of such a stored heading and restores its style, where it used to reset every key in the document and return the block as `normal`:

```ts
const stored = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'h3',
    markDefs: [],
    children: [{_type: 'span', _key: 's1', text: 'foo\nbar', marks: []}],
  },
]
applyMarkdownEdit(stored, 'foo  \nbaz')
// Previously returned the block with style 'normal' and new keys
// Now returns: [{_type: 'block', _key: 'b1', style: 'h3', markDefs: [], children: [{_type: 'span', _key: 's1', text: 'foo\nbaz', marks: []}]}]
```

Deleting the block in the edit now reports the dropped style as a `style-fallback` in `hiddenLosses`.
