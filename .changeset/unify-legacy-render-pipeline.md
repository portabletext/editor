---
"@portabletext/editor": patch
---

Internal: text blocks, root-level block objects, root-level inline objects, spans, leaves and text now all go through the container render pipeline. Legacy `renderBlock`, `renderChild`, `renderStyle`, `renderListItem`, `renderDecorator`, `renderAnnotation` and `renderPlaceholder` callbacks are unchanged and the legacy DOM structure is preserved byte-for-byte (`data-slate-node`, `data-slate-leaf`, `data-slate-string`, `data-slate-zero-width`, `data-child-*`, `pt-block` classes). Consumers see no behavior difference.
