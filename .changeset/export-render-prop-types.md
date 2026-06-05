---
"@portabletext/editor": minor
---

feat: export `defineX` render-prop types

Add public re-exports for the prop and render-function types of the
`defineContainer` / `defineTextBlock` / `defineSpan` /
`defineBlockObject` / `defineInlineObject` factories:
`ContainerRenderProps`, `ContainerRender`, `TextBlockRenderProps`,
`TextBlockRender`, `SpanRenderProps`, `SpanRender`,
`BlockObjectRenderProps`, `BlockObjectRender`, `InlineObjectRenderProps`,
`InlineObjectRender`. Consumers writing custom node renders no longer
need to derive these via `Parameters<NonNullable<...>>` inference.
