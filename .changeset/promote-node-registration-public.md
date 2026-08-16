---
'@portabletext/editor': minor
---

feat: promote node registration from alpha to public

`defineContainer`, `defineTextBlock`, `defineSpan`, `defineBlockObject`, `defineInlineObject`, `editor.registerNode`, and `NodePlugin` are no longer alpha. Their types are stable too: `Container`, `TextBlock`, `Span`, `BlockObject`, `InlineObject`, `RegistrableNode`, and the `ContainerRender`/`ContainerRenderProps`, `SpanRender`/`SpanRenderProps`, `BlockObjectRender`/`BlockObjectRenderProps`, `InlineObjectRender`/`InlineObjectRenderProps`, and `TextBlockRender`/`TextBlockRenderProps` pairs.

This is the supported replacement for the deprecated `renderBlock`, `renderChild`, `renderStyle`, and `renderListItem` render props:

```tsx
import {defineTextBlock} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'

const textBlock = defineTextBlock({
  type: 'block',
  render: ({attributes, children}) => <div {...attributes}>{children}</div>,
})

function App() {
  return (
    <EditorProvider initialConfig={{schemaDefinition}}>
      <NodePlugin nodes={[textBlock]} />
      <PortableTextEditable />
    </EditorProvider>
  )
}
```
