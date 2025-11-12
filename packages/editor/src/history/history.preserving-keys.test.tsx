import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../test/vitest'

describe('Feature: History (Preserving Keys)', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockAKey = keyGenerator()
  const spanAKey = keyGenerator()
  const blockBKey = keyGenerator()
  const spanBKey = keyGenerator()

  const initialValue = [
    {
      _key: blockAKey,
      _type: 'block',
      children: [{_key: spanAKey, _type: 'span', marks: [], text: 'Block A'}],
      markDefs: [],
      style: 'normal',
    },
    {
      _key: blockBKey,
      _type: 'block',
      children: [{_key: spanBKey, _type: 'span', marks: [], text: 'Block B'}],
      markDefs: [],
      style: 'normal',
    },
  ]
  const initialSelection = {
    focus: {path: [{_key: blockBKey}, 'children', {_key: spanBKey}], offset: 7},
    anchor: {
      path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
      offset: 7,
    },
  }

  test('Scenario: Preserving keys when undoing ', async () => {
    const {editor} = await createTestEditor({
      initialValue,
    })

    editor.send({
      type: 'delete',
      at: initialSelection,
      direction: 'backward',
      unit: 'block',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([initialValue.at(0)])
    })

    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: Preserving keys when redoing ', async () => {
    const {editor} = await createTestEditor({
      initialValue,
    })

    const blockCKey = keyGenerator()
    const spanCKey = keyGenerator()
    const blockC = {
      _key: blockCKey,
      _type: 'block',
      children: [{_key: spanCKey, _type: 'span', marks: [], text: 'Block C'}],
      markDefs: [],
      style: 'normal',
    }

    editor.send({
      type: 'insert.block',
      block: blockC,
      at: {
        anchor: {path: [{_key: blockBKey}], offset: 0},
        focus: {path: [{_key: blockBKey}], offset: 0},
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        ...initialValue,
        blockC,
      ])
    })

    editor.send({
      type: 'history.undo',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    editor.send({
      type: 'history.redo',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        ...initialValue,
        blockC,
      ])
    })
  })
})
