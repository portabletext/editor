---
title: Customize editor rendering
description: Change the way the editor renders and styles text.
sidebar:
  order: 1
---

The Portable Text Editor gives you control of how it renders each schema type element. Text blocks, block objects, inline objects, and spans render through node registrations (`defineTextBlock`, `defineBlockObject`, `defineInlineObject`, `defineSpan`) mounted with `NodePlugin`; see [Containers](/editor/concepts/containers/) for how those compose, and the [migration guide](/editor/guides/migrate-render-props/) if you're coming from the removed `renderBlock`/`renderChild` props. The render props on this page are span-level: they fire on the spans inside a block no matter who renders that block, registered or not. These choices have no impact on the Portable Text output—they only affect how the editor itself renders content.

:::note[Prerequisites]
This guide covers `@portabletext/editor` **v8.x** ([changelog](https://github.com/portabletext/editor/releases)). Requires React 19.2.7+.
:::

The following props can be passed to the `PortableTextEditable` component:

- `renderAnnotation`: For annotations (e.g., hyperlinks).
- `renderDecorator`: For decorators (e.g., strong, italic, emphasis text).
- `renderPlaceholder`: For custom placeholder text when the editor is empty.
- `rangeDecorations`: For highlighting specific ranges of text (e.g., search results, comments).

All the different render functions passed to `PortableTextEditable` can be defined as stand-alone React components.

Most follow the same pattern of reading `props` and conditionally rendering elements based on schema data.

Lists are a bit unique. A list in Portable Text is flat: a run of sibling text blocks carrying `listItem` and `level`, with no wrapper node. ([Containers](/editor/concepts/containers/) nest blocks through object fields, but lists stay flat.) Visual nesting comes from CSS. We suggest [including this example CSS](https://github.com/portabletext/editor/blob/main/examples/basic/src/editor.css) or similar to manage list rendering.

Here are basic implementations of some core types:

```tsx
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
List items in Portable Text don't nest like HTML lists. Visual nesting is achieved through CSS, and list numbering is available through `@portabletext/plugin-list-index`. See the [example CSS](https://github.com/portabletext/editor/blob/main/examples/basic/src/editor.css) for list styling patterns.
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
