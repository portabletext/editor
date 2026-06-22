# `@portabletext/plugin-dnd`

A helper plugin for tracking the drop position during drag and drop.

## Installation

```sh
npm install @portabletext/plugin-dnd
```

## Usage

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
  // `'start' | 'end'` while a block drag hovers this block, `undefined`
  // otherwise.
  const dropPosition = useDropPosition(props.path)
  return (
    <div {...props.attributes} style={{position: 'relative'}}>
      {props.children}
      {dropPosition ? <DropIndicator edge={dropPosition} /> : null}
    </div>
  )
}

// A line across the top of the block for 'start', the bottom for 'end'.
// `position: absolute` keeps it out of flow so it doesn't shift the text.
function DropIndicator({edge}: {edge: 'start' | 'end'}) {
  return (
    <div
      contentEditable={false}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: edge === 'start' ? 0 : 'auto',
        bottom: edge === 'end' ? 0 : 'auto',
        borderTop: '1px solid currentColor',
      }}
    />
  )
}
```

Call `useDropPosition` from a component the render returns, not inline in the `render` callback (it is a hook):

```tsx
defineTextBlock({type: '*', render: (props) => <MyTextBlock {...props} />})
```

The position only appears for block drags (dragging an entire block or a multi-block selection), never for text drags, and never over the dragged blocks themselves. The plugin observes the drag events and forwards them untouched, so the editor's own drag handling is unaffected.

`dragover` fires at mousemove frequency, so granularity matters: reads via `useDropPosition` re-render only when the position at their own path changes. Moving the drag from one block to another re-renders exactly two blocks, the one losing the indicator and the one gaining it.
