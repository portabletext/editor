# `@portabletext/plugin-markdown-shortcuts`

> ⬇️ Adds helpful Markdown shortcuts to the editor

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
      <MarkdownShortcutsPlugin
        boldDecorator={({schema}) =>
          schema.decorators.find((d) => d.name === 'strong')?.name
        }
        codeDecorator={({schema}) =>
          schema.decorators.find((d) => d.name === 'code')?.name
        }
        italicDecorator={({schema}) =>
          schema.decorators.find((d) => d.name === 'em')?.name
        }
        strikeThroughDecorator={({schema}) =>
          schema.decorators.find((d) => d.name === 'strike-through')?.name
        }
        defaultStyle={({schema}) =>
          schema.styles.find((s) => s.name === 'normal')?.name
        }
        headingStyle={({schema, level}) =>
          schema.styles.find((s) => s.name === `h${level}`)?.name
        }
        blockquoteStyle={({schema}) =>
          schema.styles.find((s) => s.name === 'blockquote')?.name
        }
        orderedList={({schema}) =>
          schema.lists.find((s) => s.name === 'number')?.name
        }
        unorderedList={({schema}) =>
          schema.lists.find((s) => s.name === 'bullet')?.name
        }
        horizontalRuleObject={({schema}) => {
          const schemaType = schema.blockObjects.find(
            (object) => object.name === 'break',
          )

          if (!schemaType) {
            return undefined
          }

          return {_type: schemaType.name}
        }}
        linkObject={({schema, href}) => {
          const schemaType = schema.annotations.find(
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
            [hrefField.name]: href,
          }
        }}
      />
    </EditorProvider>
  )
}
```
