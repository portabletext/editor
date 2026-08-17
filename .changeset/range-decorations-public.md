---
'@portabletext/editor': minor
---

feat: promote `RangeDecoration` and `RangeDecorationOnMovedDetails` to public API

`RangeDecoration` and `RangeDecorationOnMovedDetails` are no longer alpha. The `rangeDecorations` prop on `PortableTextEditable` was already public; the types it takes are now stable too:

```tsx
<PortableTextEditable
  rangeDecorations={[
    {
      component: (props) => <SearchResultHighlight {...props} />,
      selection: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
        focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3},
      },
      onMoved: (details) => {
        rememberSelection(details.newSelection)
      },
    },
  ]}
/>
```
