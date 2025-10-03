# `@portabletext/plugin-typography`

> Automatically transform text to typographic variants

Import the `TypographyPlugin` React component and place it inside the `EditorProvider`:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {TypographyPlugin} from '@portabletext/plugin-typography'

const schemaDefinition = defineSchema({
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}]
  decorators: [
    {name: 'em'},
    {name: 'code'},
    {name: 'strike-through'},
    {name: 'strong'},
  ],
  lists: [{name: 'bullet'}, {name: 'number'}],
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'h4'},
    {name: 'h5'},
    {name: 'h6'},
    {name: 'blockquote'},
  ],
})

function App() {
  return (
    <EditorProvider
      initialConfig={{
        schemaDefinition,
      }}
    >
      <PortableTextEditable />
      <TypographyPlugin />
    </EditorProvider>
  )
}
```

Optionally, create a `guard` to disallow the text transformations inside certain decorators:

```tsx
import {
  createDecoratorGuard,
  TypographyPlugin,
} from '@portabletext/plugin-typography'

return (
  <TypographyPlugin
    guard={createDecoratorGuard({
      decorators: ({schema}) =>
        schema.decorators.flatMap((decorator) =>
          decorator.name === 'code' ? [decorator.name] : [],
        ),
    })}
  />
)
```
