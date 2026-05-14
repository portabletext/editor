---
'@portabletext/editor': minor
---

feat: add `defineTextBlock` factory for global text block render

A new `defineTextBlock({type: 'block', render})` factory registers a wrapper around the engine's default text block rendering. Use it via the `TextBlockPlugin`:

```tsx
import {defineTextBlock, TextBlockPlugin} from '@portabletext/editor'

<TextBlockPlugin textBlocks={[
  defineTextBlock({
    type: 'block',
    render: ({attributes, children}) => (
      <p {...attributes}>{children}</p>
    ),
  }),
]} />
```

Nest `defineTextBlock` inside a parent container's `of` array for a positional override - text blocks at that position pick up the nested render, while text blocks elsewhere keep the global registration (or engine default):

```ts
defineContainer({
  type: 'callout',
  childField: 'content',
  render: ({attributes, children}) => (
    <aside {...attributes}>{children}</aside>
  ),
  of: [
    defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <p className="callout-paragraph" {...attributes}>{children}</p>
      ),
    }),
  ],
})
```

`defineTextBlock` opts into the new render pipeline: the consumer owns the outer wrapper element, and the block-level `renderStyle` / `renderListItem` / `renderBlock` props on `PortableTextEditable` do not compose under this registration. Span-level render props - `renderDecorator`, `renderAnnotation`, `renderPlaceholder` - keep working.

`defineContainer({type: 'block'})` and `defineLeaf({type: 'block'})` are rejected at compile time with branded error types pointing at `defineTextBlock`. Text blocks have their own primitive.
