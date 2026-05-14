---
'@portabletext/editor': minor
---

feat: redesign the Container API around type-keyed registration

`defineContainer` and `defineLeaf` (`@alpha`) now accept `type` and `childField` instead of `scope` and `field`:

```ts
// Before
defineContainer({
  scope: '$..table.row.cell',
  field: 'content',
  render: ...,
})

// After
defineContainer({
  type: 'cell',
  childField: 'content',
  render: ...,
})
```

Positional overrides for a child type previously expressed as multi-segment scope chains move into a nested `of` array on the parent registration:

```ts
defineContainer({
  type: 'table',
  childField: 'rows',
  render: ...,
  of: [
    {
      type: 'row',
      childField: 'cells',
      render: ...,
      of: [
        {type: 'cell', childField: 'content', render: ...},
      ],
    },
  ],
})
```

Inside `of`, write nested registrations as bare object literals; the recursive config type constrains them against the schema's `of` tree at the call site.

Dispatch is one-hop type-keyed: the engine reads `containers.get(node._type)` for global registrations, then consults the immediate parent registration's `of` array for positional overrides. The scope grammar's specificity-based walk is removed.

The `<LeafPlugin leafs={[...]}>` prop is renamed to `leaves`.

The `Containers` map on `EditorContext` (`@alpha`) is now keyed by bare `_type` (e.g. `'callout'`, `'table'`) instead of by scoped chain name. Consumers reading `editor.context.containers` should switch from `containers.get('callout.block')` to `containers.get(node._type)`.

Three combinations are structurally invalid and rejected at compile time with branded error types:

- `defineContainer({type: 'block'})` - text blocks have their own primitive; use `defineTextBlock`
- `defineContainer({type: 'span'})` - spans are leaves; use `defineLeaf`
- `defineLeaf({type: 'block'})` - text blocks have their own primitive; use `defineTextBlock`

For global text-block rendering, use `defineTextBlock({type: 'block', render})` via `<TextBlockPlugin>` (or `renderBlock` on `<PortableTextEditable>`). For positional text-block overrides previously expressed as `$..callout.block`, nest `defineTextBlock({type: 'block', render})` inside the parent container's `of` array.

`defineContainer` narrows the `node` prop on the `render` callback based on the literal `type` argument: block-object types get `PortableTextObject`. `defineLeaf` narrows `'span'` to `PortableTextSpan` and other types to `PortableTextObject`.
