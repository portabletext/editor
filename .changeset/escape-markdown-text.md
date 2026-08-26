---
'@portabletext/markdown': patch
---

fix: escape markdown syntax in plain span text during serialization

If your Portable Text contains text that happens to look like markdown, converting it to markdown and back used to corrupt it: the punctuation was read as formatting instead of text. `portableTextToMarkdown` now backslash-escapes such text, so it comes back as exactly the text it was.

```ts
// span text        markdown (before)   markdown (now)      re-parses as
'*bar*'          // *bar*               \*bar\*             the text `*bar*` (was: an emphasized span reading `bar`)
'# heading'      // # heading           \# heading          the text `# heading` (was: an `h1` block)
'[x]: y'         // [x]: y              \[x]: y             the text `[x]: y` (was: nothing, the line vanished)
```

This works wherever the text sits (headings, blockquotes, list items, table cells) and also when the risky characters are split across neighboring spans. The visible change in your output: markdown for text containing such punctuation gains backslashes it didn't have before. It pastes and parses like any hand-written markdown.

Text with the `code` decorator is never backslash-escaped. Its backtick delimiters widen instead, so the content survives verbatim even when it contains backticks:

```ts
// span text with the `code` decorator   markdown (before)   markdown (now)
'a`b'                                 // `a`b`  (broken)     ``a`b``
'`a'                                  // ``a`   (broken)     `` `a ``
```

If you supply custom mark or block renderers: `children` now arrives pre-escaped. When you need the original text, read the `text` argument instead (the built-in `code` renderer does exactly that).

Two things stay as they were. A URL with an explicit scheme (`https://…`) or an email address is not escaped: it keeps its text and simply becomes a link on the next parse. A `www.`-style address is only left alone while it contains no markdown punctuation; with it, it gets escaped like ordinary text, and the round trip keeps every character either way. And leading or trailing whitespace that markdown itself trims still trims, same as before this change.
