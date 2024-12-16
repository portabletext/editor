---
title: Customize how elements render
description: Change the way the editor renders and styles text.
sidebar:
  order: 1
---

The Portable Text Editor gives you control of how it renders each schema type element. You need to explicitly tell it what. These choices have no impact on the Portable Text output—they only affect how the editor itself renders content.

The following props can be passed to the `PortableTextEditable` component:

- `renderAnnotation`: For annotations (e.g., hyperlinks).
- `renderBlock`: For block objects (e.g., images, embeds).
- `renderChild`: For inline objects (e.g., custom emoji, stock symbols).
- `renderDecorator`: For decorators (e.g., strong, italic, emphasis text).
- `renderStyle`: For core text block types (e.g., normal, h1, h2, h3, blockquote)

All the different render functions passed to `PortableTextEditable` can be defined as stand-alone React components.

Most follow the same pattern of reading `props` and conditionally rendering elements based on schema data.

Lists are a bit unique. Portable Text has no concept of block nesting, so the solution is to use pure CSS to style them. We suggest [including this example CSS](https://github.com/portabletext/editor/blob/main/examples/basic/src/editor.css) or similar to manage list rendering.

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

// Block objects
const renderBlock: RenderBlockFunction = (props) => {
  if (props.schemaType.name === 'image' && isImage(props.value)) {
    return (
      <div
        style={{
          border: '1px dotted grey',
          padding: '0.25em',
          marginBlockEnd: '0.25em',
        }}
      >
        IMG: {props.value.src}
      </div>
    )
  }

  return <div style={{marginBlockEnd: '0.25em'}}>{props.children}</div>
}

// Check the shape of an image and confirm it has a src.
function isImage(
  props: PortableTextBlock,
): props is PortableTextBlock & {src: string} {
  return 'src' in props
}

// Styles
const renderStyle: RenderStyleFunction = (props) => {
  if (props.schemaType.value === 'h1') {
    return <h1>{props.children}</h1>
  }
  if (props.schemaType.value === 'h2') {
    return <h2>{props.children}</h2>
  }
  if (props.schemaType.value === 'h3') {
    return <h3>{props.children}</h3>
  }
  if (props.schemaType.value === 'blockquote') {
    return <blockquote>{props.children}</blockquote>
  }
  return <>{props.children}</>
}

// Inline objects
const renderChild: RenderChildFunction = (props) => {
  if (props.schemaType.name === 'stock-ticker' && isStockTicker(props.value)) {
    return (
      <span
        style={{
          border: '1px dotted grey',
          padding: '0.15em',
        }}
      >
        {props.value.symbol}
      </span>
    )
  }

  return <>{props.children}</>
}

// Check the shape of the object by confirming it has a symbol.
function isStockTicker(
  props: PortableTextChild,
): props is PortableTextChild & {symbol: string} {
  return 'symbol' in props
}
```

You can apply styles, libraries like Tailwind, or use custom react components within the rendering functions.
