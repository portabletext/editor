---
'@portabletext/editor': major
---

feat!: remove the `renderDecorator` and `renderAnnotation` render props

`renderDecorator`, `renderAnnotation`, and their `RenderDecoratorFunction`, `RenderAnnotationFunction`, `BlockDecoratorRenderProps`, and `BlockAnnotationRenderProps` types are removed. Marks render through node registrations instead: `defineDecorator` and `defineAnnotation`, mounted through `NodePlugin`, either globally or scoped to a position with `of`, matched by exact decorator name/annotation `_type` or by a `'*'` catch-all.

```tsx
// Before
<PortableTextEditable
  renderDecorator={(props) =>
    props.value === 'strong' ? <strong>{props.children}</strong> : props.children
  }
/>

// After
const strong = defineDecorator({
  type: 'strong',
  render: ({children}) => <strong>{children}</strong>,
})
<NodePlugin nodes={[strong]} />
```

The legacy props carried `editorElementRef`, a ref to the engine-owned leaf DOM anchor. No registration exposes it: a decorator's `render` owns the markup outright, while an annotation's `render` composes inside the engine's own anchor rather than owning it. Either way, put a ref on your own rendered element instead; that reaches the same position in the DOM for both kinds. The [migration guide](https://www.portabletext.org/editor/guides/migrate-render-props/) walks through the rest of the replacement.

`renderPlaceholder` and `rangeDecorations` are unaffected.
