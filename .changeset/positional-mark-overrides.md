---
'@portabletext/editor': minor
---

feat: accept `Decorator` and `Annotation` entries in `defineTextBlock`'s `of`

`defineTextBlock`'s `of` array, previously `Span | InlineObject` only,
now also takes `Decorator` and `Annotation` entries, giving decorators
and annotations the same positional scoping spans and inline objects
already had:

```ts
defineDecorator({
  type: 'strong',
  render: ({children}) => <strong>{children}</strong>,
})

defineTextBlock({
  type: 'block',
  of: [
    defineDecorator({
      type: 'strong',
      render: ({children}) => <mark>{children}</mark>,
    }),
  ],
})
```

With both registered, `strong` renders as `<mark>` inside these text
blocks and as `<strong>` everywhere else. Remove the positional
entry's `render` and `strong` renders as `<strong>` everywhere: an
entry without a `render` defers to the global registration instead of
silencing it. `'*'` entries work at both levels and lose to an exact
`type` match at the same level. The legacy `renderDecorator`/
`renderAnnotation` render props fire only for types with no
registration at all.
