---
'@portabletext/editor': minor
---

feat: add `defineTextBlock` factory for global text block render

A new `defineTextBlock({type: 'block', render})` factory registers a wrapper around the engine's default text block rendering. Register it through `NodePlugin` (see `register-node-api`).

Nest `defineTextBlock` inside a parent container's `of` array for a positional override - text blocks at that position pick up the nested render, while text blocks elsewhere keep the global registration (or engine default).

`defineTextBlock` opts into the new render pipeline: the consumer owns the outer wrapper element, and the block-level `renderStyle` / `renderListItem` / `renderBlock` props on `PortableTextEditable` do not compose under this registration. Span-level render props - `renderDecorator`, `renderAnnotation`, `renderPlaceholder` - keep working.
