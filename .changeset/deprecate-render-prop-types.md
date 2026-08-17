---
'@portabletext/editor': patch
---

fix: deprecate the legacy render-prop payload types

`BlockRenderProps`, `BlockChildRenderProps`, `BlockStyleRenderProps`, and `BlockListItemRenderProps` are deprecated together with the render props they serve (`renderBlock`, `renderChild`, `renderStyle`, `renderListItem`). Type against the node registration API instead: `BlockObjectRenderProps` / `TextBlockRenderProps` for blocks, `InlineObjectRenderProps` / `SpanRenderProps` for children, and `defineTextBlock` render props for styles and list items. See the migration guide: https://www.portabletext.org/editor/guides/migrate-render-props/
