---
'@portabletext/editor': minor
---

feat: redesign the registration API around `registerNode`

The five `define*` factories now register through a single
`editor.registerNode({node})` method (and a `<NodePlugin nodes={[...]}>`
plugin component). `defineLeaf` is replaced by three category-specific
factories that match the Portable Text data model: `defineSpan`,
`defineBlockObject`, and `defineInlineObject`. `defineContainer` and
`defineTextBlock` stay; `defineContainer({childField})` is renamed to
`defineContainer({arrayField})`.

## Why

`defineLeaf` lumped three data-model categories under one registration:
spans, block-level objects, and inline objects. Authors had to know which
they were registering implicitly via the schema. Three factories surface
that distinction at the call site and let the engine type-check the
consumer's intent. The single `registerNode` method collapses three
previously-parallel registration surfaces, and the `{node}` wrapper
keeps room for future registration-side properties without breaking the
call site.

## Positional overrides and composition

Every category can register globally (at the top level of
`NodePlugin.nodes`) or positionally (nested in a parent's `of` array).
The structural parent decides where the `of` lives:

- A container's children are block content. `defineContainer.of` accepts
  `Container`, `TextBlock`, or `BlockObject` registrations.
- A text block's children are inline content. `defineTextBlock.of`
  accepts `Span` or `InlineObject` registrations.

Misplacing a kind (for example nesting `defineSpan` inside a container's
`of`) is a TypeScript error.

All five factories accept `render?: Render | null` with tri-state
semantics:

- `render` omitted: at this position, fall through to the globally
  registered render (if any), otherwise the engine default.
- `render: null`: use the engine default at this position. A positional
  registration can carve out a scope (its own `of` overrides apply here)
  while opting out of the global outer render.
- `render: someFunction`: use that render at this position.

A worked example: a `callout` container keeps the global text-block
render but swaps the inline `mention` render inside it.

```tsx
const callout = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({attributes, children}) => <aside {...attributes}>{children}</aside>,
  of: [
    defineTextBlock({
      type: 'block',
      // No `render` - keep the global text-block render here.
      of: [
        defineInlineObject({
          type: 'mention',
          render: ({attributes, children, node}) => (
            <span {...attributes} className="mention-compact">
              {children}@{(node as {username?: string}).username}
            </span>
          ),
        }),
      ],
    }),
  ],
})
```
