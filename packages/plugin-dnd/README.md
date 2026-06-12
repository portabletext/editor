# `@portabletext/plugin-dnd`

A helper plugin for tracking the drop position during drag and drop.

When a consumer takes over block rendering through the `defineX` pipeline, the engine renders no drop-indicator chrome: where a dragged block would land is deliberately left to the consumer, since drop indication is pointer-driven UI, not document structure. This plugin tracks the position for you, derived from the editor's public `drag.*` behavior events.

```tsx
import {DndProvider, useDropPosition} from '@portabletext/plugin-dnd'

function MyEditor() {
  return (
    <EditorProvider initialConfig={...}>
      <DndProvider>
        <PortableTextEditable />
      </DndProvider>
    </EditorProvider>
  )
}

function MyTextBlock(props: TextBlockRenderProps) {
  const dropPosition = useDropPosition(props.path)
  // `'start' | 'end'` while a block drag hovers this block,
  // `undefined` otherwise; render your own indicator
}
```

The position only appears for block drags (dragging an entire block or a multi-block selection), never for text drags, and never over the dragged blocks themselves. The plugin observes the drag events and forwards them untouched, so the editor's own drag handling is unaffected.

`dragover` fires at mousemove frequency, so granularity matters: reads via `useDropPosition` re-render only when the position at their own path changes. Moving the drag from one block to another re-renders exactly two blocks, the one losing the indicator and the one gaining it.
