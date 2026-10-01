# `@portabletext/plugin-decorations`

> Compose independent decoration layers (highlights, comments, presence) for the Portable Text Editor

## Installation

```sh
npm install @portabletext/plugin-decorations
```

## Usage

The [Decorate content guide](https://www.portabletext.org/editor/guides/decorate-content/) walks through highlights, comments, live positions, and presence carets.

`useDecorationLayer` registers a layer of decorations with the editor and returns a handle for reading their live, edit-adjusted positions and reacting to `moved`/`content-changed`/`lost` events. Layers from different parts of an app compose: each renders independently, and removing one never touches another:

```tsx
import type {Decoration} from '@portabletext/editor'
import {
  DecorationsPlugin,
  useDecorationLayer,
  useDecorations,
} from '@portabletext/plugin-decorations'

function CommentsLayer(props: {comments: Array<Comment>}) {
  const layer = useDecorationLayer({
    decorations: props.comments.map(
      (comment): Decoration => ({
        id: comment.id,
        type: 'range',
        range: comment.range,
        render: ({children}) => <mark>{children}</mark>,
      }),
    ),
    on: (events) => {
      // persist `moved`, `content-changed`, and `lost` events here
    },
  })

  const positions = useDecorations(layer)

  return <CommentsPanel positions={positions} />
}

// A layer that only renders (presence carets, syntax highlighting)
// doesn't need the handle:
;<DecorationsPlugin decorations={presenceDecorations} />
```

Outside React, `createDecorationLayer(editor, {decorations, on})` creates the same layer the hook manages.
