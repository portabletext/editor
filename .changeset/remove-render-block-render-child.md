---
'@portabletext/editor': major
---

feat!: remove the `renderBlock` and `renderChild` render props

`renderBlock`, `renderChild`, and their `RenderBlockFunction`, `RenderChildFunction`, `BlockRenderProps`, and `BlockChildRenderProps` types are removed. Text blocks, block objects, inline objects, and spans render through node registrations instead: `defineTextBlock`, `defineBlockObject`, `defineInlineObject`, and `defineSpan`, mounted through `NodePlugin`. The [migration guide](https://www.portabletext.org/editor/guides/migrate-render-props/) walks through the replacement for each prop.

The span-level props (`renderDecorator`, `renderAnnotation`, `renderPlaceholder`) and `rangeDecorations` are unaffected: they keep composing over whatever renders a block, registered or not. Default rendering for a type with no matching registration is unchanged.
