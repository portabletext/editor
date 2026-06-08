---
'@portabletext/editor': minor
---

feat: replace `focused` and `selected` render props with `useIsFocused*` and `useIsSelected*` hooks

The `focused` and `selected` props are no longer passed to the render callbacks of `defineContainer`, `defineTextBlock`, `defineBlockObject`, `defineInlineObject`, and `defineSpan`. Read them from inside your render body with the new hooks instead:

```ts
import {
  useIsFocusedContainer,
  useIsFocusedLeaf,
  useIsSelectedContainer,
  useIsSelectedLeaf,
} from '@portabletext/editor'

defineBlockObject({
  type: 'image',
  render: ({attributes, children, path, node}) => {
    const focused = useIsFocusedLeaf(path)
    const selected = useIsSelectedLeaf(path)
    return (
      <div {...attributes} aria-selected={selected} data-focused={focused}>
        {children}
        <img src={node.src as string} />
      </div>
    )
  },
})
```

Use `useIsFocusedContainer` and `useIsSelectedContainer` for `defineContainer` and `defineTextBlock` renders; use `useIsFocusedLeaf` and `useIsSelectedLeaf` for `defineBlockObject`, `defineInlineObject`, and `defineSpan` renders.

Each hook subscribes to a single slice of selection state and only triggers a re-render when its own value flips. Renders that don't read `focused` or `selected` no longer re-render when the caret moves between unrelated nodes.

The legacy `renderBlock`, `renderChild`, `renderDecorator`, and `renderAnnotation` callbacks on `<PortableTextEditable>` still receive `focused` and `selected` and are not affected.
