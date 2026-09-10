---
'@portabletext/markdown': patch
---

fix: emit no blank lines for empty text blocks

A block that renders to the empty string (an empty or whitespace-only text block, or a custom renderer returning `''`) no longer leaves blank lines in `portableTextToMarkdown`'s output: `[h1 'foo', empty block, 'bar']` now serializes to `# foo\n\nbar` instead of `# foo\n\n\n\nbar`. A dropped block never survived reparsing anyway, and a custom `blockSpacing` callback now sees the pair of blocks that actually end up adjacent, never an invisible one. Two spacing consequences show in rendered HTML: two blockquotes separated only by an empty block now join into one quote with a paragraph break, and a list whose blank lines came only from empty blocks goes tight, since a skipped block no longer counts toward looseness.

The same filter runs inside containers: callout and structured-blockquote content joins skip empty blocks, so no more blank quote-prefixed lines. In list items, the marker line goes to the first block that renders output, with two exceptions that keep the markdown reparseable: a multi-line block (a code fence, a table) keeps its later lines indented inside the item instead of escaping the list at column 0, and a nested list or, on a task item, any non-text block stays indented below a bare marker, because after `- [x] ` (or fused with `- `) it would reparse as plain words.
