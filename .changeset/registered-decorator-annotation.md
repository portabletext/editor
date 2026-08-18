---
'@portabletext/editor': minor
---

feat: add `defineDecorator`/`defineAnnotation` node registrations

Decorators and annotations join the node registration API:
`defineDecorator` and `defineAnnotation`, mounted through `NodePlugin`,
alongside `Decorator`/`DecoratorRender`/`DecoratorRenderProps` and
`Annotation`/`AnnotationRender`/`AnnotationRenderProps`. `type` is the
decorator name (`defineDecorator`) or the annotation markDef
`_type` (`defineAnnotation`) declared in the schema, or `'*'` to match
every decorator or annotation:

```ts
defineDecorator({
  type: 'strong',
  render: ({children}) => <strong>{children}</strong>,
})

defineAnnotation({
  type: 'link',
  render: ({annotation, children}) => (
    <a href={(annotation as {href?: string}).href}>{children}</a>
  ),
})
```

A registration for a decorator or annotation type wins over the legacy
`renderDecorator`/`renderAnnotation` render props on
`<PortableTextEditable>`; those props still fire for any decorator or
annotation type without a matching registration. `renderDecorator` and
`renderAnnotation` (and their `RenderDecoratorFunction`/
`RenderAnnotationFunction`/`BlockDecoratorRenderProps`/
`BlockAnnotationRenderProps` types) are now deprecated in favor of the
node registration API. The migration guide walks through each prop:
https://www.portabletext.org/editor/guides/migrate-render-props/
