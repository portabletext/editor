# `@portabletext/plugin-range-decorations`

> Compose independent range-decoration layers (highlights, comments, presence) for the Portable Text Editor

## Installation

```sh
npm install @portabletext/plugin-range-decorations
```

## Usage

`useRangeDecorationLayer` registers a layer of range decorations independent of any `PortableTextEditable`'s `rangeDecorations` prop, and returns a handle for reading its live, edit-adjusted positions and reacting to `moved`/`content-changed`/`lost` events:

```tsx
import {
  defineRangeDecoration,
  RangeDecorationPlugin,
  useRangeDecorationLayer,
  useRangeDecorations,
} from '@portabletext/plugin-range-decorations'

function CommentsLayer(props: {comments: Array<Comment>}) {
  const layer = useRangeDecorationLayer({
    rangeDecorations: props.comments.map((comment) =>
      defineRangeDecoration({
        id: comment.id,
        range: comment.range,
        render: ({children}) => <mark>{children}</mark>,
      }),
    ),
    on: (events) => {
      // persist `moved`, `content-changed`, and `lost` events here
    },
  })

  const positions = useRangeDecorations(layer)

  return <CommentsPanel positions={positions} />
}

// Write-only consumers (presence carets, syntax highlighting) stay on the plugin:
;<RangeDecorationPlugin rangeDecorations={presenceDecorations} />
```

The imperative handle remains for module-level and non-component consumers: `createRangeDecorationLayer(editor, {rangeDecorations, on})` returns the same layer the hook manages.
