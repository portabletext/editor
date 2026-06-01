---
'@portabletext/markdown': major
---

`markdownToPortableText` now uses a first-party parser. The `markdown-it` and `@mdit/plugin-alert` dependencies have been removed. The public API contract is unchanged — same options, same Portable Text output. Bundle size drops from ~61 KB to ~15 KB gzipped.
