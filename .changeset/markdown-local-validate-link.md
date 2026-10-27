---
'@portabletext/markdown': patch
---

fix: check image URLs without a module-level `markdown-it` instance

Loading `@portabletext/markdown` no longer builds a `markdown-it` parser up front just to check image URLs in `portableTextToMarkdown`. The check now runs a local copy of `markdown-it`'s default link validator, so images are accepted and rejected exactly as before, and the serializer no longer references `markdown-it` at all.
