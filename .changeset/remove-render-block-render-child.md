---
'@portabletext/editor': major
---

feat!: remove the `renderBlock` and `renderChild` render props

`renderBlock`, `renderChild`, and their `RenderBlockFunction`, `RenderChildFunction`, `BlockRenderProps`, and `BlockChildRenderProps` types are removed. Text blocks, block objects, inline objects, and spans render through node registrations instead: `defineTextBlock`, `defineBlockObject`, `defineInlineObject`, and `defineSpan`, mounted through `NodePlugin`. The [migration guide](https://www.portabletext.org/editor/guides/migrate-render-props/) walks through the replacement for each prop.

`renderPlaceholder` and `rangeDecorations` are unaffected.
