---
'@portabletext/editor': minor
---

feat: expose `useDropPosition` and `DropIndicator` from `@portabletext/editor`

```tsx
import {useDropPosition, DropIndicator} from '@portabletext/editor'

function MyBlock(props: BlockRenderProps) {
  const dropPosition = useDropPosition(props.path)

  return (
    <>
      {dropPosition === 'start' ? <DropIndicator /> : null}
      {props.children}
      {dropPosition === 'end' ? <DropIndicator /> : null}
    </>
  )
}
```

The engine continues to paint the default drop indicator via `renderBlock` and `renderListItem`; this exposes the same publication surface so consumers can render their own indicator on top of (or in place of) custom render callbacks.
