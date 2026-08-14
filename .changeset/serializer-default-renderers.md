---
'@portabletext/markdown': minor
---

feat: render code, image, horizontal rule, HTML, and callout blocks to markdown by default

`portableTextToMarkdown` now renders `code`, `image`, `horizontal-rule`, `html`, and `callout` block objects back to Markdown by default, instead of a fenced JSON block. This matches `table`, which already rendered as GFM by default.

`code`, `image`, `html`, and `callout` fall back to the fenced JSON rendering when a value doesn't match the shape its renderer expects, for example a consumer's own differently-shaped `code` type reaching the renderer via the same `_type` name; `horizontal-rule` always renders `---`. A consumer-supplied `types` renderer still wins over any of the defaults.

`@portabletext/editor`'s markdown clipboard picks this up via the automatic dependency bump: copying a code block, image, horizontal rule, HTML block, or callout out of the editor now produces real Markdown instead of a fenced JSON block.

One narrow behavioral fix rides along: when a `callout` or `DefaultBlockquoteObjectRenderer` content entry falls back to fenced JSON, the JSON is the original value; previously it carried a `style: 'normal'` field injected by the renderer.
