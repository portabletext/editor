import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {isActiveListItem} from '../src/selectors'
import {createTestEditor} from '../src/test/vitest'

test('Scenario: a selection spanning a bullet block and a plain block is not an active list item', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockAKey = keyGenerator()
  const spanAKey = keyGenerator()
  const blockBKey = keyGenerator()
  const spanBKey = keyGenerator()
  const initialValue = [
    {
      _key: blockAKey,
      _type: 'block',
      children: [{_key: spanAKey, _type: 'span', marks: [], text: '12'}],
      markDefs: [],
      style: 'normal',
      level: 1,
      listItem: 'bullet',
    },
    {
      _key: blockBKey,
      _type: 'block',
      children: [{_key: spanBKey, _type: 'span', marks: [], text: '34'}],
      markDefs: [],
      style: 'normal',
    },
  ]

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      lists: [{name: 'bullet'}],
    }),
    initialValue,
  })

  editor.send({type: 'focus'})
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
        offset: 2,
      },
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
        offset: 2,
      },
      backward: false,
    })
  })

  expect(isActiveListItem('bullet')(editor.getSnapshot())).toBe(false)
})

test('Scenario: a selection wholly inside a bullet block is an active list item', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockAKey = keyGenerator()
  const spanAKey = keyGenerator()
  const blockBKey = keyGenerator()
  const spanBKey = keyGenerator()
  const initialValue = [
    {
      _key: blockAKey,
      _type: 'block',
      children: [{_key: spanAKey, _type: 'span', marks: [], text: '12'}],
      markDefs: [],
      style: 'normal',
    },
    {
      _key: blockBKey,
      _type: 'block',
      children: [{_key: spanBKey, _type: 'span', marks: [], text: '34'}],
      markDefs: [],
      style: 'normal',
      level: 1,
      listItem: 'bullet',
    },
  ]

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({
      lists: [{name: 'bullet'}],
    }),
    initialValue,
  })

  editor.send({type: 'focus'})
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
        offset: 2,
      },
    },
  })

  await vi.waitFor(() => {
    expect(isActiveListItem('bullet')(editor.getSnapshot())).toBe(true)
  })
})
