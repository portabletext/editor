import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import {expect, test, vi} from 'vitest'
import {defineSchema, useEditor, type PortableTextBlock} from '../src'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {getFirstBlock} from '../src/selectors/selector.get-first-block'
import {getFocusTextBlock} from '../src/selectors/selector.get-focus-text-block'
import {getPreviousBlock} from '../src/selectors/selector.get-previous-block'
import {createTestEditor} from '../src/test/vitest'
import {getBlockEndPoint} from '../src/utils/util.get-block-end-point'
import {getTextBlockText} from '../src/utils/util.get-text-block-text'

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

  const {editor} = await createTestEditor({
    children: <DocumentTitlePlugin />,
    keyGenerator,
    schemaDefinition: defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
      styles: [{name: 'h1'}],
    }),
    initialValue,
  })

  editor.send({
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

  editor.send({
    type: 'delete.backward',
    unit: 'character',
  })

  await vi.waitFor(() => {
    return expect(editor.getSnapshot().context.value).toEqual([
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
