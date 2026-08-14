---
'@portabletext/editor': major
---

feat!: remove the `renderStyle` render prop

The `renderStyle` render prop on `<PortableTextEditable>` is removed, along with the `RenderStyleFunction` type. Text-block styles render through a `defineTextBlock` registration instead: the registered `render` callback receives the block as `props.node` and owns the wrapper element.

```tsx
import {defineTextBlock} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'

const textBlock = defineTextBlock({
  type: 'block',
  render: (props) =>
    props.node.style === 'h1' ? (
      <h1 {...props.attributes}>{props.children}</h1>
    ) : (
      <div {...props.attributes}>{props.children}</div>
    ),
})

// Inside `EditorProvider`:
// <NodePlugin nodes={[textBlock]} />
```

The `BlockStyleRenderProps` type remains exported but is deprecated.
