# `@portabletext/plugin-dnd`

> Track the drop position during drag and drop for custom drop indicators

## Installation

```sh
npm install @portabletext/plugin-dnd
```

## Usage

The editor never draws a drop indicator: showing where a dragged block would land is left to your render, since drop indication is pointer-driven UI, not document structure. This plugin tracks the position for you, derived from the editor's public `drag.*` behavior events. The [Drag and drop blocks guide](https://www.portabletext.org/editor/guides/drag-and-drop/) walks through drag handles and drop indicators.

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
        pointerEvents: 'none',
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
