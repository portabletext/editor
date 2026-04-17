---
"@portabletext/editor": patch
---

fix: unify legacy render pipeline through container pipeline

Text blocks, root-level block objects, root-level inline objects, spans, leaves and text now all go through the container render pipeline internally. The legacy `renderBlock`, `renderChild`, `renderStyle`, `renderListItem`, `renderDecorator`, `renderAnnotation` and `renderPlaceholder` callbacks are unchanged and the legacy DOM structure is preserved byte-for-byte. Consumers see no behavior difference.
