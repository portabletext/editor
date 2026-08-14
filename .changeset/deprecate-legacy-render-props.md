---
'@portabletext/editor': patch
---

fix: deprecate the block-level render props on `<PortableTextEditable>`

`renderBlock`, `renderChild`, `renderStyle`, and `renderListItem` are deprecated, along with their function types. They keep working, but node registrations (`defineTextBlock`, `defineBlockObject`, `defineInlineObject`, `defineSpan` mounted through `NodePlugin`) are the supported way to render nodes, and list numbering comes from `@portabletext/plugin-list-index`. The migration guide walks through each prop: https://www.portabletext.org/editor/guides/migrate-render-props/

The span-level props (`renderDecorator`, `renderAnnotation`, `renderPlaceholder`) and `rangeDecorations` are not deprecated.
