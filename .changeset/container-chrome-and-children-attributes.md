---
'@portabletext/editor': minor
---

feat: container `render` callback receives a separate `childrenAttributes` bag

Container render callbacks now receive both `attributes` and `childrenAttributes`. Spread `attributes` on the outer chrome element and `childrenAttributes` on the element wrapping `{children}`. For single-element containers, spread both on the same element with `childrenAttributes` last:

```tsx
defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({attributes, childrenAttributes, children}) => (
    <div {...attributes} {...childrenAttributes}>{children}</div>
  ),
})
```

For containers with a body wrapper, spread on the body element:

```tsx
defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: ({attributes, childrenAttributes, children}) => (
    <table {...attributes}>
      <tbody {...childrenAttributes}>{children}</tbody>
    </table>
  ),
})
```

`attributes` carries chrome markers (`contentEditable={false}`, `draggable`, `data-pt-block="container"`, `data-pt-path`). `childrenAttributes` carries body markers (`contentEditable={true}`, `data-pt-container-children`). Containers that ignore `attributes` and render `<>{children}</>` are unaffected.
