import {page} from '@vitest/browser/context'
import React, {useEffect} from 'react'
import {expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type Editor,
  type PortableTextBlock,
} from '../src'
import {defineBehavior, execute} from '../src/behaviors'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins'
import {
  getFirstBlock,
  getFocusTextBlock,
  getPreviousBlock,
} from '../src/selectors'
import {getBlockEndPoint, getTextBlockText} from '../src/utils'

function DocumentTitlePlugin() {
  const editor = useEditor()

  useEffect(() => {
    return editor.registerBehavior({
      behavior: defineBehavior({
        on: 'delete.backward',
        guard: ({snapshot}) => {
          const firstBlock = getFirstBlock(snapshot)
          const previousBlock = getPreviousBlock(snapshot)
          const focusTextBlock = getFocusTextBlock(snapshot)

          if (!focusTextBlock || !firstBlock || !previousBlock) {
            return false
          }

          if (firstBlock.node._key !== previousBlock.node._key) {
            return false
          }

          const firstBlockEndPont = getBlockEndPoint({
            context: snapshot.context,
            block: firstBlock,
          })
          const text = getTextBlockText(focusTextBlock.node)

          return {firstBlockEndPont, focusTextBlock, text}
        },
        actions: [
          (_, {firstBlockEndPont, focusTextBlock, text}) => [
            execute({
              type: 'select.previous block',
              select: 'end',
            }),
            execute({
              type: 'insert.text',
              text,
            }),
            execute({
              type: 'delete.block',
              at: focusTextBlock.path,
            }),
            execute({
              type: 'select',
              at: {
                anchor: firstBlockEndPont,
                focus: firstBlockEndPont,
              },
            }),
          ],
        ],
      }),
    })
  }, [editor])

  return null
}

test(DocumentTitlePlugin.name, async () => {
  const editorRef = React.createRef<Editor>()
  const keyGenerator = createTestKeyGenerator()
  const titleBlockKey = keyGenerator()
  const titleSpanKey = keyGenerator()
  const bodyBlockKey = keyGenerator()
  const boSpanKey = keyGenerator()
  const dySpanKey = keyGenerator()

  const initialValue: Array<PortableTextBlock> = [
    {
      _key: titleBlockKey,
      _type: 'block',
      children: [{_key: titleSpanKey, _type: 'span', text: 'title', marks: []}],
      markDefs: [],
      style: 'h1',
    },
    {
      _key: bodyBlockKey,
      _type: 'block',
      children: [
        {_key: boSpanKey, _type: 'span', text: 'bo', marks: ['strong', 'em']},
        {_key: dySpanKey, _type: 'span', text: 'dy', marks: ['strong']},
      ],
      markDefs: [],
      style: 'normal',
    },
  ]

  render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}, {name: 'em'}],
          styles: [{name: 'h1'}],
        }),
        initialValue,
      }}
    >
      <DocumentTitlePlugin />
      <EditorRefPlugin ref={editorRef} />
      <PortableTextEditable />
    </EditorProvider>,
  )

  const locator = page.getByRole('textbox')
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

  editorRef.current?.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: bodyBlockKey}, 'children', {_key: boSpanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: bodyBlockKey}, 'children', {_key: dySpanKey}],
        offset: 0,
      },
    },
  })

  editorRef.current?.send({
    type: 'delete.backward',
    unit: 'character',
  })

  await vi.waitFor(() => {
    return expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: titleBlockKey,
        _type: 'block',
        children: [
          {_key: titleSpanKey, _type: 'span', text: 'titlebody', marks: []},
        ],
        markDefs: [],
        style: 'h1',
      },
    ])
  })
})
