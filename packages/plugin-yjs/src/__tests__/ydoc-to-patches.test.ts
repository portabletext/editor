import {describe, expect, test} from 'vitest'
import * as Y from 'yjs'
import {blockToYText} from '../apply-to-ydoc'
import {createKeyMap} from '../key-map'
import type {KeyMap} from '../types'
import {ydocToPatches} from '../ydoc-to-patches'

/**
 * Helper: create a Y.Doc with a single text block.
 */
function createDocWithBlock(opts: {
  blockKey: string
  spanKey: string
  text: string
  style?: string
  marks?: string[]
}) {
  const {blockKey, spanKey, text, style = 'normal', marks = []} = opts
  const yDoc = new Y.Doc()
  const root = yDoc.getXmlFragment('content')
  const keyMap = createKeyMap()

  yDoc.transact(() => {
    const yBlock = blockToYText(
      {
        _key: blockKey,
        _type: 'block',
        style,
        markDefs: [],
        children: [
          {
            _key: spanKey,
            _type: 'span',
            text,
            marks,
          },
        ],
      },
      keyMap,
    )
    root.insert(0, [yBlock])
  })

  const block = keyMap.getYText(blockKey)!
  return {yDoc, root, block, keyMap}
}

/**
 * Helper: create a Y.Doc with two blocks.
 */
function createDocWithTwoBlocks() {
  const yDoc = new Y.Doc()
  const root = yDoc.getXmlFragment('content')
  const keyMap = createKeyMap()

  yDoc.transact(() => {
    const block1 = blockToYText(
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'first', marks: []}],
      },
      keyMap,
    )
    const block2 = blockToYText(
      {
        _key: 'b2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's2', _type: 'span', text: 'second', marks: []}],
      },
      keyMap,
    )
    root.insert(0, [block1, block2])
  })

  return {yDoc, root, keyMap}
}

/**
 * Helper: collect patches from a Y.Doc mutation.
 * Sets up observeDeep, runs the mutation with a remote origin,
 * and returns the patches produced by ydocToPatches.
 */
function collectPatches(opts: {
  root: Y.XmlFragment
  keyMap: KeyMap
  mutate: () => void
}) {
  const {root, keyMap, mutate} = opts
  const collectedPatches: Array<unknown> = []

  const handler = (events: Y.YEvent<any>[], _transaction: Y.Transaction) => {
    // In real usage, we'd skip local origin. Here we use a remote origin.
    const patches = ydocToPatches(events, keyMap)
    collectedPatches.push(...patches)
  }

  root.observeDeep(handler)

  // Run mutation with a "remote" origin
  const yDoc = root.doc!
  yDoc.transact(() => {
    mutate()
  }, 'remote-editor')

  root.unobserveDeep(handler)

  return collectedPatches
}

describe('ydocToPatches', () => {
  describe('text changes → diffMatchPatch', () => {
    test('text inserted at end of span produces diffMatchPatch', () => {
      const {root, block, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
      })

      const patches = collectPatches({
        root,
        keyMap,
        mutate: () => {
          // Insert " world" at position 5 with same span attributes
          block.insert(5, ' world', {
            _key: 's1',
            _type: 'span',
            marks: '[]',
          })
        },
      })

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
      })
    })

    test('text inserted at beginning of span produces diffMatchPatch', () => {
      const {root, block, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'world',
      })

      const patches = collectPatches({
        root,
        keyMap,
        mutate: () => {
          block.insert(0, 'hello ', {
            _key: 's1',
            _type: 'span',
            marks: '[]',
          })
        },
      })

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
      })
    })

    test('text deleted from span produces diffMatchPatch', () => {
      const {root, block, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello world',
      })

      const patches = collectPatches({
        root,
        keyMap,
        mutate: () => {
          block.delete(5, 6) // delete " world"
        },
      })

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
      })
    })
  })

  describe('block attribute changes → set patch', () => {
    test('changing block style produces set patch', () => {
      const {root, block, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
        style: 'normal',
      })

      const patches = collectPatches({
        root,
        keyMap,
        mutate: () => {
          block.setAttribute('style', 'h1')
        },
      })

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'set',
        path: [{_key: 'b1'}, 'style'],
        value: 'h1',
      })
    })

    test('adding listItem produces set patch', () => {
      const {root, block, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
      })

      const patches = collectPatches({
        root,
        keyMap,
        mutate: () => {
          block.setAttribute('listItem', 'bullet')
        },
      })

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'set',
        path: [{_key: 'b1'}, 'listItem'],
        value: 'bullet',
      })
    })
  })

  describe('span attribute changes → set patch', () => {
    test('changing span marks produces set patch', () => {
      const {root, block, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
        marks: [],
      })

      const patches = collectPatches({
        root,
        keyMap,
        mutate: () => {
          block.format(0, 5, {marks: '["strong"]'})
        },
      })

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'],
        value: ['strong'],
      })
    })
  })

  describe('block structural changes', () => {
    test('block deleted produces unset patch', () => {
      const {root, keyMap} = createDocWithTwoBlocks()

      const patches = collectPatches({
        root,
        keyMap,
        mutate: () => {
          root.delete(1, 1) // delete second block
        },
      })

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'unset',
        path: [{_key: 'b2'}],
      })
    })

    test('new block inserted produces insert patch', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
      })

      const patches = collectPatches({
        root,
        keyMap,
        mutate: () => {
          const newBlock = blockToYText(
            {
              _key: 'b2',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 's2', _type: 'span', text: 'new block', marks: []},
              ],
            },
            keyMap,
          )
          root.insert(1, [newBlock])
        },
      })

      expect(patches).toHaveLength(1)
      expect(patches[0]).toMatchObject({
        type: 'insert',
        position: 'after',
        path: [{_key: 'b1'}],
      })
    })
  })
})
