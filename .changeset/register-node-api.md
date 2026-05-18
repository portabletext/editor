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

All five factories accept an optional `render` function. Omit
it to fall through to the globally registered render (or the engine
default if none is registered). Provide a function to override the
render at this position. The function receives the same render props
that come from the engine, plus a `renderDefault` callback that
produces the engine default when invoked:

```tsx
defineContainer({
  type: 'callout',
  arrayField: 'children',
  render: (props) => (
    <div className="callout-frame">{props.renderDefault(props)}</div>
  ),
})
```

`renderDefault` takes the same props shape the callback receives, so
it can be invoked with modified props for fine-grained control. The
return type is `ReactElement` - render functions must return an
element. The pattern mirrors `renderDefault` on Sanity Studio's
render APIs.

## Engine namespace and the new render pipeline

`registerNode` opts a subtree into the new render pipeline. Inside the
new pipeline the engine emits only `data-pt-*` attributes - the
legacy `data-slate-*` attributes are stripped. The legacy pipeline
keeps emitting both namespaces so existing consumers stay on the same
DOM shape. Engine-internal DOM queries target `data-pt-*` so the
engine itself is pipeline-agnostic; consumer CSS that targets the
released v6 attributes (`.pt-block`, `.pt-inline-object`,
`data-block-key`, `data-child-type`, and friends) keeps working
unchanged in the legacy pipeline.

The block-level legacy render hooks (`renderBlock`, `renderListItem`,
`renderStyle`, `renderChild`) are suppressed inside new-pipeline
subtrees - the registered render owns the position. The span/leaf-level
hooks (`renderDecorator`, `renderAnnotation`, `renderPlaceholder`, and
range decorations) keep firing in both pipelines because they wrap
runs of styled text rather than emit pipeline-shaped wrappers.

The engine-default `renderDefault` helpers for void block-objects and
inline-objects mirror the legacy DOM contract. Block-objects keep the
outer editable (Slate's void caret semantics need the spacer caret
anchor) and put `contentEditable={false}` and `draggable={!readOnly}`
together on the inner placeholder. Inline-objects auto-receive
`contentEditable={false}` on the outer (engine-injected for inline
voids) and put `draggable={!readOnly}` alone on the inner; the inner
inherits non-editability through DOM `contentEditable` inheritance.

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
          render: ({attributes, children, node, readOnly}) => (
            <span {...attributes} className="mention-compact">
              {children}
              <span draggable={!readOnly}>
                @{(node as {username?: string}).username}
              </span>
            </span>
          ),
        }),
      ],
    }),
  ],
})
```
