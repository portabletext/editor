# `@portabletext/plugin-character-pair-decorator`

> ✨ Automatically match a pair of characters and decorate the text in between

Import the `CharacterPairDecoratorPlugin` React component and place it inside the `EditorProvider` to automatically register the necessary Behaviors:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {CharacterPairDecoratorPlugin} from '@portabletext/plugin-character-pair-decorator'

function App() {
  return (
    <EditorProvider
      initialConfig={{
        schemaDefinition: defineSchema({
          decorators: [{name: 'italic'}],
        }),
      }}
    >
      <PortableTextEditable />
      <CharacterPairDecoratorPlugin
        decorator={({context}) =>
          context.schema.decorators.find((d) => d.name === 'italic')?.name
        }
        pair={{char: '#', amount: 1}}
      />
    </EditorProvider>
  )
}
```
