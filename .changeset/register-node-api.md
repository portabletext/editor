---
'@portabletext/editor': minor
---

feat: redesign the registration API around `registerNode`

The five `define*` factories register through a single
`editor.registerNode({node})` method (and a `<NodePlugin nodes={[...]}>`
plugin component). `defineLeaf` is replaced by three category-specific
factories that match the Portable Text data model: `defineSpan`,
`defineBlockObject`, and `defineInlineObject`. `defineContainer` and
`defineTextBlock` complete the set.

## Why

`defineLeaf` lumped three data-model categories under one registration:
spans, block-level objects, and inline objects. Authors had to know which
they were registering implicitly via the schema. Three factories surface
that distinction at the call site and let the engine type-check the
consumer's intent. The single `registerNode` method collapses three
previously-parallel registration surfaces, and the `{node}` wrapper
keeps room for future registration-side properties without breaking the
call site.

## Render callback props

Every factory's `render` callback receives `attributes`, `children`,
`node`, `path`, `focused`, `selected`, and `readOnly`. `focused` is
`true` when the registered node is the innermost node holding the
caret; `selected` is `true` when the node sits in the path of any leaf
in the selection range and cascades up the ancestor chain; `path` is
the node's keyed path.

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

## Inspecting registered containers

`editor.context.containers` is a `ReadonlyMap<string, RegisteredContainer>`
of registered editable containers, keyed by bare `_type`. Each value
carries `{kind: 'container', type, field, of?}` - the resolved child
array field plus any positional `of` registrations declared on the
parent. The companion `RegisteredPositional` union covers spans, block
objects, and inline objects nested in a container's `of`. Render
callbacks are engine-internal and not surfaced on the public view. Use
`resolveContainerAt(containers, value, path)` to resolve the entry
that applies at a given position.
