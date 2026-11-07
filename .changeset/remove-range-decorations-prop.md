---
'@portabletext/editor': major
---

feat!: remove the `rangeDecorations` prop from `PortableTextEditable`

Use `editor.registerDecorations` or `@portabletext/plugin-decorations` instead. `selection` becomes `range` (never `null`), `component` becomes `render` (it receives `children`, `isFirst` and `isLast`), `onMoved` becomes the layer's `on` events, and `payload` is closed over by `render`. Every decoration needs an `id` and `type: 'range'`. The `RangeDecoration` type is replaced by `Decoration`, and `RangeDecorationOnMovedDetails` by `DecorationEvent` (from `@portabletext/plugin-decorations`), which is what a layer's `on` receives.

```tsx
// Before
<PortableTextEditable
  rangeDecorations={[
    {
      selection,
      component: ({children}) => <mark>{children}</mark>,
      payload: {},
    },
  ]}
/>

// After, inside a component rendered under `EditorProvider`
import {useDecorationLayer} from '@portabletext/plugin-decorations'

function Highlights({range}) {
  useDecorationLayer({
    decorations: [
      {
        id: 'highlight',
        type: 'range',
        range,
        render: ({children}) => <mark>{children}</mark>,
      },
    ],
  })

  return null
}
```
