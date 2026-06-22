# `@portabletext/plugin-character-pair-decorator`

> Automatically match a pair of characters and decorate the text in between

## Installation

```sh
npm install @portabletext/plugin-character-pair-decorator
```

## Usage

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

## Why look up the decorator in the schema?

The `decorator` callback returns the name found in `context.schema`
(`context.schema.decorators.find((d) => d.name === 'italic')?.name`) instead
of a hardcoded `'italic'`. That lookup is what makes it schema-aware: if the
schema has no such decorator the callback returns `undefined` and the pairing
is skipped, so it never applies a decorator the schema does not declare.

The same gating follows [containers](../schema/README.md#containers-and-sub-schemas),
because `context.schema` is resolved at the caret: inside a code block whose
sub-schema declares no decorators the pairing is skipped. Read
`context.schema` rather than capturing the top-level schema and the plugin
stays correct at every nesting level.
