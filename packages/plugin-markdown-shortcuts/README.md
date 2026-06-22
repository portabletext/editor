# `@portabletext/plugin-markdown-shortcuts`

> Adds helpful Markdown shortcuts to the editor

## Installation

```sh
npm install @portabletext/plugin-markdown-shortcuts
```

## Usage

Import the `MarkdownShortcutsPlugin` React component and place it inside the `EditorProvider` and tell it about your schema:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'

const schemaDefinition = defineSchema({
  blockObjects: [{name: 'break'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
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
      <MarkdownShortcutsPlugin
        boldDecorator={({context}) =>
          context.schema.decorators.find((d) => d.name === 'strong')?.name
        }
        codeDecorator={({context}) =>
          context.schema.decorators.find((d) => d.name === 'code')?.name
        }
        italicDecorator={({context}) =>
          context.schema.decorators.find((d) => d.name === 'em')?.name
        }
        strikeThroughDecorator={({context}) =>
          context.schema.decorators.find((d) => d.name === 'strike-through')
            ?.name
        }
        defaultStyle={({context}) =>
          context.schema.styles.find((s) => s.name === 'normal')?.name
        }
        headingStyle={({context, props}) =>
          context.schema.styles.find((s) => s.name === `h${props.level}`)?.name
        }
        blockquoteStyle={({context}) =>
          context.schema.styles.find((s) => s.name === 'blockquote')?.name
        }
        orderedList={({context}) =>
          context.schema.lists.find((s) => s.name === 'number')?.name
        }
        unorderedList={({context}) =>
          context.schema.lists.find((s) => s.name === 'bullet')?.name
        }
        horizontalRuleObject={({context}) => {
          const schemaType = context.schema.blockObjects.find(
            (object) => object.name === 'break',
          )

          if (!schemaType) {
            return undefined
          }

          return {_type: schemaType.name}
        }}
        linkObject={({context, props}) => {
          const schemaType = context.schema.annotations.find(
            (annotation) => annotation.name === 'link',
          )
          const hrefField = schemaType?.fields.find(
            (field) => field.name === 'href' && field.type === 'string',
          )

          if (!schemaType || !hrefField) {
            return undefined
          }

          return {
            _type: schemaType.name,
            [hrefField.name]: props.href,
          }
        }}
      />
    </EditorProvider>
  )
}
```

## Why look up the type in the schema?

Each callback returns the type name as found in `context.schema` (for
example `context.schema.decorators.find((d) => d.name === 'strong')?.name`)
instead of a hardcoded `'strong'`. That lookup is what makes the plugin
schema-aware: when the schema does not define the type, the lookup returns
`undefined` and the shortcut is skipped, so the plugin never inserts a
decorator, style, or object the schema does not declare. Hardcoding the
string would fire the shortcut regardless and produce content the schema
forbids.

The same gating follows [containers](../schema/README.md#containers-and-sub-schemas),
because `context.schema` is the schema resolved at the caret, not always the
top-level one. Inside a code block whose sub-schema declares no decorators, a
`boldDecorator` that looks up `strong` returns `undefined`, so the shortcut
is skipped there too. Point each callback at `context.schema` rather than
capturing the top-level schema and the shortcuts stay correct at every
nesting level.
