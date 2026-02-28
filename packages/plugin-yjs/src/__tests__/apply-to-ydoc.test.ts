import {describe, expect, test} from 'vitest'
import * as Y from 'yjs'
import {applyPatchToYDoc, blockToYText} from '../apply-to-ydoc'
import {createKeyMap} from '../key-map'
import type {KeyMap} from '../types'

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
 * Helper: get block text from delta (toString returns XML, not plain text).
 */
function getBlockText(keyMap: KeyMap, blockKey: string): string {
  const yBlock = keyMap.getYText(blockKey)
  if (!yBlock) {
    return ''
  }
  const delta = yBlock.toDelta() as Array<{
    insert: string | Y.XmlText
  }>
  let text = ''
  for (const entry of delta) {
    if (typeof entry.insert === 'string') {
      text += entry.insert
    }
  }
  return text
}

/**
 * Helper: get block delta entries.
 */
function getBlockDelta(
  keyMap: KeyMap,
  blockKey: string,
): Array<{insert: string; attributes?: Record<string, unknown>}> {
  const yBlock = keyMap.getYText(blockKey)
  if (!yBlock) {
    return []
  }
  return yBlock.toDelta() as Array<{
    insert: string
    attributes?: Record<string, unknown>
  }>
}

describe('blockToYText', () => {
  test('converts a simple block to Y.XmlText', () => {
    const yDoc = new Y.Doc()
    const root = yDoc.getXmlFragment('test')
    const keyMap = createKeyMap()

    let yBlock!: Y.XmlText
    yDoc.transact(() => {
      yBlock = blockToYText(
        {
          _key: 'b1',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
        },
        keyMap,
      )
      root.insert(0, [yBlock])
    })

    expect(yBlock.getAttribute('_key')).toBe('b1')
    expect(yBlock.getAttribute('_type')).toBe('block')
    expect(yBlock.getAttribute('style')).toBe('normal')
    expect(yBlock.getAttribute('markDefs')).toBe('[]')

    const delta = yBlock.toDelta() as Array<{
      insert: string
      attributes?: Record<string, unknown>
    }>
    expect(delta).toHaveLength(1)
    expect(delta[0]!.insert).toBe('hello')
    expect(delta[0]!.attributes?.['_key']).toBe('s1')
    expect(delta[0]!.attributes?.['marks']).toBe('[]')

    // KeyMap should be populated
    expect(keyMap.getYText('b1')).toBe(yBlock)
    expect(keyMap.getKey(yBlock)).toBe('b1')
  })

  test('converts a block with multiple spans', () => {
    const yDoc = new Y.Doc()
    const root = yDoc.getXmlFragment('test')
    const keyMap = createKeyMap()

    let yBlock!: Y.XmlText
    yDoc.transact(() => {
      yBlock = blockToYText(
        {
          _key: 'b1',
          _type: 'block',
          style: 'normal',
          markDefs: [
            {_key: 'link1', _type: 'link', href: 'https://example.com'},
          ],
          children: [
            {_key: 's1', _type: 'span', text: 'hello ', marks: []},
            {_key: 's2', _type: 'span', text: 'world', marks: ['strong']},
          ],
        },
        keyMap,
      )
      root.insert(0, [yBlock])
    })

    const delta = yBlock.toDelta() as Array<{
      insert: string
      attributes?: Record<string, unknown>
    }>
    expect(delta).toHaveLength(2)
    expect(delta[0]!.insert).toBe('hello ')
    expect(delta[0]!.attributes?.['_key']).toBe('s1')
    expect(delta[1]!.insert).toBe('world')
    expect(delta[1]!.attributes?.['_key']).toBe('s2')
    expect(delta[1]!.attributes?.['marks']).toBe('["strong"]')
  })
})

describe('applyPatchToYDoc', () => {
  describe('diffMatchPatch', () => {
    test('applies text insertion at end of span', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
      })

      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -1,5 +1,11 @@\n hello\n+ world\n',
        },
        root,
        keyMap,
      )

      expect(getBlockText(keyMap, 'b1')).toBe('hello world')
    })

    test('applies text insertion at beginning of span', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'world',
      })

      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -1,5 +1,11 @@\n+hello \n world\n',
        },
        root,
        keyMap,
      )

      expect(getBlockText(keyMap, 'b1')).toBe('hello world')
    })

    test('applies text deletion', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello world',
      })

      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -1,11 +1,5 @@\n hello\n- world\n',
        },
        root,
        keyMap,
      )

      expect(getBlockText(keyMap, 'b1')).toBe('hello')
    })
  })

  describe('set patch', () => {
    test('sets block style', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
        style: 'normal',
      })

      applyPatchToYDoc(
        {
          type: 'set',
          path: [{_key: 'b1'}, 'style'],
          value: 'h1',
        },
        root,
        keyMap,
      )

      const yBlock = keyMap.getYText('b1')!
      expect(yBlock.getAttribute('style')).toBe('h1')
    })

    test('sets block listItem', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
      })

      applyPatchToYDoc(
        {
          type: 'set',
          path: [{_key: 'b1'}, 'listItem'],
          value: 'bullet',
        },
        root,
        keyMap,
      )

      const yBlock = keyMap.getYText('b1')!
      expect(yBlock.getAttribute('listItem')).toBe('bullet')
    })

    test('sets span marks', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
        marks: [],
      })

      applyPatchToYDoc(
        {
          type: 'set',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'],
          value: ['strong'],
        },
        root,
        keyMap,
      )

      const delta = getBlockDelta(keyMap, 'b1')
      expect(delta[0]!.attributes?.['marks']).toBe('["strong"]')
    })

    test('sets markDefs as JSON', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
      })

      const markDefs = [
        {_key: 'link1', _type: 'link', href: 'https://example.com'},
      ]
      applyPatchToYDoc(
        {
          type: 'set',
          path: [{_key: 'b1'}, 'markDefs'],
          value: markDefs,
        },
        root,
        keyMap,
      )

      const yBlock = keyMap.getYText('b1')!
      expect(yBlock.getAttribute('markDefs')).toBe(JSON.stringify(markDefs))
    })
  })

  describe('unset patch', () => {
    test('removes a block', () => {
      const {root, keyMap} = createDocWithTwoBlocks()

      expect(root.length).toBe(2)

      applyPatchToYDoc(
        {
          type: 'unset',
          path: [{_key: 'b2'}],
        },
        root,
        keyMap,
      )

      expect(root.length).toBe(1)
      expect(keyMap.getYText('b2')).toBeUndefined()
    })

    test('removes a block attribute', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
      })

      // First set listItem
      const yBlock = keyMap.getYText('b1')!
      yBlock.setAttribute('listItem', 'bullet')

      applyPatchToYDoc(
        {
          type: 'unset',
          path: [{_key: 'b1'}, 'listItem'],
        },
        root,
        keyMap,
      )

      expect(yBlock.getAttribute('listItem')).toBeUndefined()
    })
  })

  describe('insert patch', () => {
    test('inserts a block after another', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'first',
      })

      applyPatchToYDoc(
        {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'after',
          items: [
            {
              _key: 'b2',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 's2', _type: 'span', text: 'second', marks: []},
              ],
            },
          ],
        },
        root,
        keyMap,
      )

      expect(root.length).toBe(2)
      expect(keyMap.getYText('b2')).toBeDefined()
      expect(getBlockText(keyMap, 'b2')).toBe('second')
    })

    test('inserts a block before another', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'second',
      })

      applyPatchToYDoc(
        {
          type: 'insert',
          path: [{_key: 'b1'}],
          position: 'before',
          items: [
            {
              _key: 'b0',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 's0', _type: 'span', text: 'first', marks: []}],
            },
          ],
        },
        root,
        keyMap,
      )

      expect(root.length).toBe(2)
      const firstBlock = root.get(0) as Y.XmlText
      expect(firstBlock.getAttribute('_key')).toBe('b0')
    })
  })

  describe('setIfMissing patch', () => {
    test('sets attribute if not present', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
      })

      applyPatchToYDoc(
        {
          type: 'setIfMissing',
          path: [{_key: 'b1'}, 'listItem'],
          value: 'bullet',
        },
        root,
        keyMap,
      )

      const yBlock = keyMap.getYText('b1')!
      expect(yBlock.getAttribute('listItem')).toBe('bullet')
    })

    test('does not overwrite existing attribute', () => {
      const {root, keyMap} = createDocWithBlock({
        blockKey: 'b1',
        spanKey: 's1',
        text: 'hello',
        style: 'h1',
      })

      applyPatchToYDoc(
        {
          type: 'setIfMissing',
          path: [{_key: 'b1'}, 'style'],
          value: 'normal',
        },
        root,
        keyMap,
      )

      const yBlock = keyMap.getYText('b1')!
      expect(yBlock.getAttribute('style')).toBe('h1')
    })
  })
})
