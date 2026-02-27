---
'@portabletext/html': minor
'@portabletext/block-tools': minor
'@portabletext/editor': patch
---

Extract HTML-to-Portable Text conversion into new `@portabletext/html` package

New `@portabletext/html` package with `htmlToPortableText(html, options?)` API, mirroring `@portabletext/markdown`. Schema moves from positional argument to options object. `unstable_whitespaceOnPasteMode` renamed to `whitespace`. Zero `@sanity/*` dependencies.

`@portabletext/block-tools` becomes a thin legacy adapter preserving the `htmlToBlocks(html, schema, options)` signature for backward compatibility. All source code and tests moved to `@portabletext/html`.

Editor package updated to import from `@portabletext/html` directly.
