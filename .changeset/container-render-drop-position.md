---
"@portabletext/editor": minor
---

feat: pass `dropPosition` to `defineContainer`'s render callback

Containers receive the resolved drop position (`'start' | 'end' | undefined`) when a drag targets the container's block boundary. Consumers paint their own drop indicator using whatever DOM and styling they prefer:

```tsx
defineContainer({
  scope: '$..callout',
  field: 'content',
  render: ({attributes, children, dropPosition}) => (
    <div {...attributes} data-drop-position={dropPosition}>
      {children}
    </div>
  ),
})
```
