import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {safeStringify} from '../src/internal-utils/safe-json'
import {createTestEditor} from '../src/test/vitest'

async function createMidBlockEditor() {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    initialValue: [
      {
        _key: blockKey,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'foo bar', marks: []}],
      },
    ],
  })
  const point = {
    path: [{_key: blockKey}, 'children', {_key: spanKey}],
    offset: 4,
  }
  editor.send({type: 'select', at: {anchor: point, focus: point}})
  return {editor}
}

const blocks = [
  {_type: 'block', style: 'normal', children: [{_type: 'span', text: 'one'}]},
  {_type: 'block', style: 'normal', children: [{_type: 'span', text: 'two'}]},
]

describe('event.insert.blocks: caret after inserting text blocks mid-block', () => {
  test.each([
    ['select end', {select: 'end' as const}],
    ['default select', {}],
  ])(
    'Scenario: with %s, the caret lands after the inserted text, not at the end of the merged block',
    async (_name, options) => {
      const {editor} = await createMidBlockEditor()

      editor.send({
        type: 'insert.blocks',
        placement: 'auto',
        blocks,
        ...options,
      })

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          ['B: foo one', 'B: two|bar'].join('\n'),
        )
      })
    },
  )

  test('Scenario: pasting Portable Text mid-block leaves the caret after the pasted text', async () => {
    const {editor} = await createMidBlockEditor()

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(
      'application/x-portable-text',
      safeStringify(
        blocks.map((block, index) => ({
          ...block,
          _key: `p${index}`,
          markDefs: [],
          children: [{...block.children[0], _key: `q${index}`, marks: []}],
        })),
      ),
    )
    editor.send({
      type: 'clipboard.paste',
      originEvent: {dataTransfer},
      position: {selection: editor.getSnapshot().context.selection!},
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo one', 'B: two|bar'].join('\n'),
      )
    })
  })
})
