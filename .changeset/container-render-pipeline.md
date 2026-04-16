---
"@portabletext/editor": patch
---

fix: internal container render pipeline with `defineLeaf` API

Content inside containers now renders through a bespoke pipeline that uses `data-pt-*` attributes instead of the root pipeline's `data-slate-*` attributes. The container pipeline supports `defineLeaf` for custom leaf rendering, `renderDecorator`/`renderAnnotation` for mark wrapping, `renderPlaceholder` for empty block placeholders, and range decorations.

`defineLeaf` also applies to root-level block objects and to inline objects inside root text blocks. When a leaf config is registered, those nodes render through the new pipeline instead of the legacy `renderBlock` / `renderChild` callbacks.
