import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {InputRulePlugin} from './plugin.input-rule'
import {defineTextTransformRule} from './text-transform-rule'

const arrowRule = defineTextTransformRule({
  on: /->$/,
  transform: () => '→',
})

test('Scenario: `insert.text` at a position in another block does not apply a rule to the caret block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockAKey = keyGenerator()
  const spanAKey = keyGenerator()
  const blockBKey = keyGenerator()
  const spanBKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _type: 'block',
        _key: blockAKey,
        children: [{_type: 'span', _key: spanAKey, text: 'foo-', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBKey,
        children: [{_type: 'span', _key: spanBKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: <InputRulePlugin rules={[arrowRule]} />,
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      backward: false,
    })
  })

  editor.send({
    type: 'insert.text',
    at: [{_key: blockBKey}, 'children', {_key: spanBKey}],
    offset: 3,
    text: '>',
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockAKey,
        children: [{_type: 'span', _key: spanAKey, text: 'foo-', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBKey,
        children: [{_type: 'span', _key: spanBKey, text: 'bar>', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      backward: false,
    })
  })
})

test('Scenario: `insert.text` at a later position in the caret block does not apply a rule at the caret', async () => {
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
        children: [{_type: 'span', _key: spanKey, text: 'foo-bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: <InputRulePlugin rules={[arrowRule]} />,
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 4},
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 4},
      backward: false,
    })
  })

  editor.send({
    type: 'insert.text',
    at: [{_key: blockKey}, 'children', {_key: spanKey}],
    offset: 7,
    text: '>',
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo-bar>', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 4,
      },
      focus: {path: [{_key: blockKey}, 'children', {_key: spanKey}], offset: 4},
      backward: false,
    })
  })
})
