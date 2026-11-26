import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

test('Scenario: inserting a text block without children at an interior caret preserves fragment insertion', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
      },
    ],
  })
  editor.send({
    type: 'select',
    at: {
      anchor: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 1},
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 1},
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      backward: false,
    })
  })
  editor.send({type: 'insert.block', block: {_type: 'block'}, placement: 'auto', select: 'none'})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: 'k0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'k1', text: 'bar', marks: []}],
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
      backward: false,
    })
  })
})
