import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'

describe('indexMap is keyed by path with bare-_key read fallback', () => {
  test('Scenario: initial build populates the path-keyed view', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'bar'}],
        },
      ],
    })

    expect([...editor.getSnapshot().indexMap]).toEqual([
      ['[_key=="b0"]', 0],
      ['[_key=="b0"].children[_key=="s0"]', 0],
      ['[_key=="b1"]', 1],
      ['[_key=="b1"].children[_key=="s1"]', 0],
    ])
  })

  test('Scenario: enter inserts a sibling and shifts the path-keyed view', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'foo'}],
        },
      ],
    })

    await userEvent.click(locator)
    await userEvent.keyboard('{End}{Enter}bar')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(2)
    })

    // Map insertion order follows normalization visits; with defaults
    // deferred to local edits, `b0`'s child entry is re-registered by the
    // split and iterates last. The entries and indexes are what matter.
    expect(new Map(editor.getSnapshot().indexMap)).toEqual(
      new Map([
        ['[_key=="b0"]', 0],
        ['[_key=="b0"].children[_key=="s0"]', 0],
        ['[_key=="k2"]', 1],
        ['[_key=="k2"].children[_key=="k3"]', 0],
      ]),
    )
  })

  test('Scenario: delete.block clears the removed entry and shifts the survivor', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'bar'}],
        },
      ],
    })

    editor.send({type: 'delete.block', at: [{_key: 'b0'}]})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toHaveLength(1)
    })

    expect([...editor.getSnapshot().indexMap]).toEqual([
      ['[_key=="b1"]', 0],
      ['[_key=="b1"].children[_key=="s1"]', 0],
    ])
  })

  test('Scenario: .get and .has accept a bare _key', async () => {
    const {editor} = await createTestEditor({
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'foo'}],
        },
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: 'bar'}],
        },
      ],
    })

    const indexMap = editor.getSnapshot().indexMap

    expect(indexMap.get('b0')).toBe(0)
    expect(indexMap.get('b1')).toBe(1)
    expect(indexMap.get('[_key=="b0"]')).toBe(0)
    expect(indexMap.get('[_key=="b1"]')).toBe(1)
    expect(indexMap.has('b0')).toBe(true)
    expect(indexMap.has('b1')).toBe(true)
    expect(indexMap.has('missing')).toBe(false)
  })

  test('Scenario: deprecated `blockIndexMap` is the same map as `indexMap`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
        },
      ],
    })

    const snapshot = editor.getSnapshot()

    expect(snapshot.blockIndexMap).toBe(snapshot.indexMap)
  })
})
