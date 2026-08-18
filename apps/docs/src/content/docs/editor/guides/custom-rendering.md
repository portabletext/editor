---
title: Customize editor rendering
description: Change the way the editor renders and styles text.
sidebar:
  order: 1
---

This page covers the span-level render props: `renderAnnotation`, `renderDecorator`, `renderPlaceholder`, and `rangeDecorations`, passed directly to `PortableTextEditable`. Block-level rendering, for text blocks, block objects, inline objects, and containers, goes through node registrations (`defineTextBlock`, `defineBlockObject`, `defineInlineObject`, `defineSpan`) mounted with `NodePlugin` instead; see [Containers](/editor/concepts/containers/) for that model. `renderAnnotation` and `renderDecorator` fire on the spans inside a block no matter who renders that block, registered or not; `renderPlaceholder` fires on the empty editor instead of a span, and `rangeDecorations` is a prop carrying decoration configs, not a render callback.

If your editor still renders through the deprecated `renderBlock`, `renderChild`, `renderStyle`, or `renderListItem` props, the [migration guide](/editor/guides/migrate-render-props/) walks through moving to registrations. None of these choices affect the Portable Text output: they only change how the editor itself renders content.

:::note[Prerequisites]
This guide covers `@portabletext/editor`. Requires React 19.2.8 or later. Check the [editor changelog](https://github.com/portabletext/editor/releases) for breaking changes.
:::

:::caution[Deprecated]
`renderDecorator` and `renderAnnotation` are deprecated and will be removed in a future major version. Node registrations (`defineDecorator`, `defineAnnotation`) replace them; the [migration guide](/editor/guides/migrate-render-props/) walks through both props. `renderPlaceholder` is not deprecated.
:::

The following props can be passed to the `PortableTextEditable` component:

- `renderAnnotation`: For annotations (e.g., hyperlinks). (deprecated)
- `renderDecorator`: For decorators (e.g., strong, italic, emphasis text). (deprecated)
- `renderPlaceholder`: For custom placeholder text when the editor is empty.
- `rangeDecorations`: For highlighting specific ranges of text (e.g., search results, comments).

All the different render functions passed to `PortableTextEditable` can be defined as stand-alone React components.

Most follow the same pattern of reading `props` and conditionally rendering elements based on schema data.

Lists are a bit unique. A list in Portable Text is flat: a run of sibling text blocks carrying `listItem` and `level`, with no wrapper node. ([Containers](/editor/concepts/containers/) nest blocks through object fields, but lists stay flat.) Visual nesting comes from CSS, and list numbering comes from [`@portabletext/plugin-list-index`](https://github.com/portabletext/editor/tree/main/packages/plugin-list-index). We suggest [including this example CSS](https://github.com/portabletext/editor/blob/main/examples/basic/src/editor.css) or similar to manage list rendering.

Here are basic implementations of some core types:

```tsx
import type {
  RenderAnnotationFunction,
  RenderDecoratorFunction,
} from '@portabletext/editor'

const renderDecorator: RenderDecoratorFunction = (props) => {
  if (props.value === 'strong') {
    return <strong>{props.children}</strong>
  }
  if (props.value === 'em') {
    return <em>{props.children}</em>
  }
  if (props.value === 'underline') {
    return <u>{props.children}</u>
  }
  return <>{props.children}</>
}

// Annotations
const renderAnnotation: RenderAnnotationFunction = (props) => {
  if (props.schemaType.name === 'link') {
    return <span style={{textDecoration: 'underline'}}>{props.children}</span>
  }

  return <>{props.children}</>
}
```

:::note
List items in Portable Text don't nest like HTML lists. Visual nesting is achieved through CSS. See the [example CSS](https://github.com/portabletext/editor/blob/main/examples/basic/src/editor.css) for list styling patterns.
:::

## Placeholder text

Use `renderPlaceholder` to display custom placeholder text when the editor is empty:

```tsx
<PortableTextEditable
  renderPlaceholder={() => <span style={{color: '#999'}}>Start typing...</span>}
  // ... other props
/>
```

## Range decorations

Use `rangeDecorations` to highlight specific ranges of text. This is useful for features like search highlighting, comments, or collaborative cursors:

```tsx
import type {RangeDecoration} from '@portabletext/editor'

const decorations: RangeDecoration[] = [
  {
    selection: {
      anchor: {path: [{_key: 'block1'}, 'children', {_key: 'span1'}], offset: 0},
      focus: {path: [{_key: 'block1'}, 'children', {_key: 'span1'}], offset: 5},
    },
    component: ({children}) => (
      <span style={{backgroundColor: 'yellow'}}>{children}</span>
    ),
  },
]

<PortableTextEditable
  rangeDecorations={decorations}
  // ... other props
/>
```

You can apply styles, libraries like Tailwind, or use custom react components within the rendering functions.

### Following a range across edits

Edits can move, shrink, or invalidate a decorated range: typing before it shifts its offsets, and deleting it removes it entirely. Pass `onMoved` on a `RangeDecoration` to keep your own state in sync instead of recomputing the selection from scratch:

```tsx
import type {
  EditorSelection,
  RangeDecoration,
  RangeDecorationOnMovedDetails,
} from '@portabletext/editor'
import {useState} from 'react'

function Highlight() {
  const [highlightSelection, setHighlightSelection] = useState<EditorSelection>(
    {
      anchor: {
        path: [{_key: 'block1'}, 'children', {_key: 'span1'}],
        offset: 0,
      },
      focus: {path: [{_key: 'block1'}, 'children', {_key: 'span1'}], offset: 5},
    },
  )

  const onMoved = (details: RangeDecorationOnMovedDetails) => {
    // `newSelection` is `null` when the edit removed the decorated range.
    setHighlightSelection(details.newSelection)
  }

  const decorations: RangeDecoration[] = [
    {
      selection: highlightSelection,
      component: ({children}) => (
        <span style={{backgroundColor: 'yellow'}}>{children}</span>
      ),
      onMoved,
    },
  ]

  return (
    <PortableTextEditable
      rangeDecorations={decorations}
      // ... other props
    />
  )
}
```
