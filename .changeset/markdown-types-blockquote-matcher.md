---
'@portabletext/markdown': minor
---

feat: add `types.blockquote` matcher to `markdownToPortableText` for structured blockquotes

When a `types.blockquote` matcher is provided, plain blockquotes become structural block-objects (`{_type: 'blockquote', content: [...]}`) instead of flat text blocks with `style: 'blockquote'`. This unlocks placing code blocks, images, lists, and nested blockquotes inside a quote without losing attribution. GFM alerts (`> [!NOTE]`, `> [!TIP]`, etc.) keep producing callouts via the separate `types.callout` matcher; the two never compete on the same source.

Without `types.blockquote`, the existing flat-block path runs unchanged. If the matcher returns `undefined` for a given blockquote, the parser falls back to the flat shape for that one.

Adds `DefaultBlockquoteObjectRenderer` for the round-trip back to Markdown.
