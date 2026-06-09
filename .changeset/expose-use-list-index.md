---
'@portabletext/editor': minor
---

feat: expose `useListIndex` from `@portabletext/editor`

```tsx
import {useListIndex} from '@portabletext/editor'

function MyListItem(props: BlockListItemRenderProps) {
  const listIndex = useListIndex(props.path)

  return (
    <li data-list-index={listIndex}>
      {props.children}
    </li>
  )
}
```

The engine continues to paint `data-list-index` on the default `renderListItem`; this exposes the same publication surface so consumers can thread the index through their own markup.
