---
title: Customize editor rendering
description: Change the way the editor renders and styles text.
sidebar:
  order: 1
---

Marks (decorators and annotations) render through node registrations: `defineDecorator` and `defineAnnotation`, mounted with `NodePlugin` alongside the editor's other registrations. [Rendering](/editor/concepts/rendering/) covers the model every registration shares: markup ownership, dispatch precedence, and `renderDefault`. [Containers](/editor/concepts/containers/) covers positional overrides, rendering a mark differently only inside one part of the document.

`renderPlaceholder` and `rangeDecorations`, the remaining rendering props without a registration equivalent, stay on `<PortableTextEditable>`; this guide documents them below.

The `renderDecorator`, `renderAnnotation`, `renderBlock`, `renderChild`, `renderStyle`, and `renderListItem` props are removed in this major; the [migration guide](/editor/guides/migrate-render-props/) walks through moving to registrations. None of these choices affect the Portable Text output: they only change how the editor itself renders content.

## Decorators

Register one `defineDecorator` per decorator name. `render` receives the styled `children` to wrap:

```tsx
import {defineDecorator} from '@portabletext/editor'

const strong = defineDecorator({
  type: 'strong',
  render: ({children}) => <strong>{children}</strong>,
})
const em = defineDecorator({
  type: 'em',
  render: ({children}) => <em>{children}</em>,
})
const underline = defineDecorator({
  type: 'underline',
  render: ({children}) => <u>{children}</u>,
})
```

Or keep one switching function with `type: '*'`, which matches any decorator that has no more specific registration; see [dispatch precedence](/editor/concepts/rendering/#dispatch-precedence) for how it ranks against an exact `type` match:

```tsx
const decorator = defineDecorator({
  type: '*',
  render: ({children, decorator}) => {
    if (decorator === 'strong') {
      return <strong>{children}</strong>
    }
    if (decorator === 'em') {
      return <em>{children}</em>
    }
    if (decorator === 'underline') {
      return <u>{children}</u>
    }
    return <>{children}</>
  },
})
```

## Annotations

Register `defineAnnotation` for a markDef `_type`. `render` receives the markDef object as `annotation`:

```tsx
import {defineAnnotation} from '@portabletext/editor'

const link = defineAnnotation({
  type: 'link',
  render: ({annotation, children}) =>
    typeof annotation.href === 'string' ? (
      <a href={annotation.href}>{children}</a>
    ) : (
      children
    ),
})
```

`render` is a plain function call, not a component, so hooks inside it violate the Rules of Hooks. When a render needs hooks, for example to open a tooltip on the annotation, return a component instead:

```tsx
import {useState} from 'react'
import type {AnnotationRenderProps} from '@portabletext/editor'

function LinkSpan(props: AnnotationRenderProps) {
  const [hovered, setHovered] = useState(false)
  const href =
    typeof props.annotation.href === 'string' ? props.annotation.href : ''

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{textDecoration: 'underline'}}
    >
      {props.children}
      {hovered ? <span className="tooltip">{href}</span> : null}
    </span>
  )
}

const link = defineAnnotation({
  type: 'link',
  render: (props) => <LinkSpan {...props} />,
})
```

## Mount the registrations

Marks join the same `nodes` array as your other registrations, mounted through one `NodePlugin`: see [Register a node](/editor/concepts/rendering/#register-a-node) on the Rendering page for the full example.

## Lists

Lists are a bit unique. A list in Portable Text is flat: a run of sibling text blocks carrying `listItem` and `level`, with no wrapper node. ([Containers](/editor/concepts/containers/) nest blocks through object fields, but lists stay flat.) Visual nesting comes from CSS, and list numbering comes from [`@portabletext/plugin-list-index`](https://github.com/portabletext/editor/tree/main/packages/plugin-list-index). We suggest [including this example CSS](https://github.com/portabletext/editor/blob/main/examples/basic/src/editor.css) or similar to manage list rendering.

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
