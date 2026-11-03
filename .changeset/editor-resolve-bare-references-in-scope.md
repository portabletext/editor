---
'@portabletext/editor': patch
---

fix: resolve bare type references to the nearest enclosing declaration at any depth

A bare type reference in a container's `of` now resolves to the nearest enclosing declaration of that type, then to the schema's root block object of that name. A recursive container declared inline keeps its fields when it's inserted below its first level:

```tsx
import {
  defineContainer,
  defineSchema,
  EditorProvider,
  type Editor,
} from '@portabletext/editor'
import {EditorRefPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {createRef} from 'react'
import {createRoot} from 'react-dom/client'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'section',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {type: 'block'},
            {
              type: 'object',
              name: 'subsection',
              fields: [
                {name: 'title', type: 'string'},
                {
                  name: 'content',
                  type: 'array',
                  of: [{type: 'block'}, {type: 'subsection'}],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const initialValue = [
  {
    _type: 'section',
    _key: 's1',
    content: [
      {
        _type: 'subsection',
        _key: 'ss1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 'sp1', text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ],
  },
]

const editorRef = createRef<Editor>()

createRoot(document.getElementById('root')!).render(
  <EditorProvider initialConfig={{schemaDefinition, initialValue}}>
    <EditorRefPlugin ref={editorRef} />
    <NodePlugin
      nodes={[
        defineContainer({
          type: 'section',
          arrayField: 'content',
          render: ({children}) => <>{children}</>,
        }),
        defineContainer({
          type: 'subsection',
          arrayField: 'content',
          render: ({children}) => <>{children}</>,
        }),
      ]}
    />
  </EditorProvider>,
)

// Once the editor has mounted:
const editor = editorRef.current!
const caret = {
  path: [
    {_key: 's1'},
    'content',
    {_key: 'ss1'},
    'content',
    {_key: 'b1'},
    'children',
    {_key: 'sp1'},
  ],
  offset: 3,
}
editor.send({type: 'select', at: {anchor: caret, focus: caret}})
editor.send({
  type: 'insert.block',
  block: {_type: 'subsection', _key: 'ss2', title: 'Details', content: []},
  placement: 'after',
})
// Inserts {_type: 'subsection', _key: 'ss2', title: 'Details', content: [<empty text block>]}
// Previously inserted: {_type: 'subsection', _key: 'ss2'}
```

When the same type name is declared at two depths, a reference resolves to the nearer declaration. `block.set` on a nested block declared this way now keeps the props its declaration lists instead of dropping them all, and an empty child array on such a block gets an empty text block during normalization.
