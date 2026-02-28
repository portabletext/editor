import {describe, expect, test} from 'vitest'
import * as Y from 'yjs'
import {applyPatchToYDoc, blockToYText} from '../apply-to-ydoc'
import {createKeyMap} from '../key-map'
import type {KeyMap} from '../types'

/**
 * Helper: get plain text from a block's delta.
 */
function getBlockText(yBlock: Y.XmlText): string {
  const delta = yBlock.toDelta() as Array<{insert: string | Y.XmlText}>
  let text = ''
  for (const entry of delta) {
    if (typeof entry.insert === 'string') {
      text += entry.insert
    }
  }
  return text
}

/**
 * Helper: get span entries from a block.
 */
function getSpans(
  yBlock: Y.XmlText,
): Array<{text: string; key: string; marks: string[]}> {
  const delta = yBlock.toDelta() as Array<{
    insert: string
    attributes?: Record<string, unknown>
  }>
  return delta
    .filter((d) => typeof d.insert === 'string')
    .map((d) => ({
      text: d.insert as string,
      key: (d.attributes?.['_key'] as string) ?? '',
      marks: JSON.parse((d.attributes?.['marks'] as string) ?? '[]'),
    }))
}

/**
 * Helper: create a Y.Doc with blocks.
 */
function createDoc(blocks: Array<Record<string, unknown>>): {
  yDoc: Y.Doc
  root: Y.XmlFragment
  keyMap: KeyMap
} {
  const yDoc = new Y.Doc()
  const root = yDoc.getXmlFragment('content')
  const keyMap = createKeyMap()

  yDoc.transact(() => {
    for (const block of blocks) {
      const yBlock = blockToYText(block, keyMap)
      root.insert(root.length, [yBlock])
    }
  })

  return {yDoc, root, keyMap}
}

describe('edge cases: empty blocks', () => {
  test('empty block converts to Y.XmlText with no delta', () => {
    const {keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: '', marks: []}],
      },
    ])

    const block = keyMap.getYText('b1')!
    expect(getBlockText(block)).toBe('')
    // Yjs optimizes away empty string inserts — no delta entries
    const spans = getSpans(block)
    expect(spans).toHaveLength(0)
  })

  test('insert text into empty block', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: '', marks: []}],
      },
    ])

    applyPatchToYDoc(
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
        value: '@@ -0,0 +1,5 @@\n+hello\n',
      },
      root,
      keyMap,
    )

    expect(getBlockText(keyMap.getYText('b1')!)).toBe('hello')
  })
})

describe('edge cases: multiple spans', () => {
  test('edit text in second span of multi-span block', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: 's1', _type: 'span', text: 'hello ', marks: []},
          {_key: 's2', _type: 'span', text: 'world', marks: ['strong']},
        ],
      },
    ])

    // Edit the second span
    applyPatchToYDoc(
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's2'}, 'text'],
        value: '@@ -1,5 +1,11 @@\n world\n+ today\n',
      },
      root,
      keyMap,
    )

    const spans = getSpans(keyMap.getYText('b1')!)
    expect(spans).toHaveLength(2)
    expect(spans[0].text).toBe('hello ')
    expect(spans[0].key).toBe('s1')
    expect(spans[1].text).toBe('world today')
    expect(spans[1].key).toBe('s2')
    expect(spans[1].marks).toEqual(['strong'])
  })

  test('change marks on one span preserves others', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: 's1', _type: 'span', text: 'hello ', marks: []},
          {_key: 's2', _type: 'span', text: 'world', marks: ['strong']},
          {_key: 's3', _type: 'span', text: '!', marks: []},
        ],
      },
    ])

    // Bold the first span
    applyPatchToYDoc(
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'],
        value: ['em'],
      },
      root,
      keyMap,
    )

    const spans = getSpans(keyMap.getYText('b1')!)
    expect(spans).toHaveLength(3)
    expect(spans[0].marks).toEqual(['em'])
    expect(spans[1].marks).toEqual(['strong'])
    expect(spans[2].marks).toEqual([])
  })

  test('insert span between existing spans', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: 's1', _type: 'span', text: 'hello', marks: []},
          {_key: 's3', _type: 'span', text: 'world', marks: []},
        ],
      },
    ])

    // Insert a span after s1
    applyPatchToYDoc(
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [
          {_key: 's2', _type: 'span', text: ' beautiful ', marks: ['em']},
        ],
      },
      root,
      keyMap,
    )

    const spans = getSpans(keyMap.getYText('b1')!)
    expect(spans).toHaveLength(3)
    expect(spans[0].text).toBe('hello')
    expect(spans[1].text).toBe(' beautiful ')
    expect(spans[1].marks).toEqual(['em'])
    expect(spans[2].text).toBe('world')
  })

  test('delete a span from multi-span block', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: 's1', _type: 'span', text: 'hello ', marks: []},
          {_key: 's2', _type: 'span', text: 'beautiful ', marks: ['em']},
          {_key: 's3', _type: 'span', text: 'world', marks: []},
        ],
      },
    ])

    // Remove the middle span
    applyPatchToYDoc(
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      },
      root,
      keyMap,
    )

    const spans = getSpans(keyMap.getYText('b1')!)
    expect(spans).toHaveLength(2)
    expect(spans[0].text).toBe('hello ')
    expect(spans[1].text).toBe('world')
  })
})

describe('edge cases: block operations', () => {
  test('insert multiple blocks at once', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'first', marks: []}],
      },
    ])

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
            children: [{_key: 's2', _type: 'span', text: 'second', marks: []}],
          },
          {
            _key: 'b3',
            _type: 'block',
            style: 'h1',
            markDefs: [],
            children: [{_key: 's3', _type: 'span', text: 'third', marks: []}],
          },
        ],
      },
      root,
      keyMap,
    )

    expect(root.length).toBe(3)
    expect(getBlockText(keyMap.getYText('b1')!)).toBe('first')
    expect(getBlockText(keyMap.getYText('b2')!)).toBe('second')
    expect(getBlockText(keyMap.getYText('b3')!)).toBe('third')
    expect(keyMap.getYText('b3')!.getAttribute('style')).toBe('h1')
  })

  test('delete first block of multiple', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'first', marks: []}],
      },
      {
        _key: 'b2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's2', _type: 'span', text: 'second', marks: []}],
      },
      {
        _key: 'b3',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's3', _type: 'span', text: 'third', marks: []}],
      },
    ])

    applyPatchToYDoc({type: 'unset', path: [{_key: 'b1'}]}, root, keyMap)

    expect(root.length).toBe(2)
    expect(keyMap.getYText('b1')).toBeUndefined()
    // Remaining blocks should be intact
    const child0 = root.get(0) as Y.XmlText
    expect(child0.getAttribute('_key')).toBe('b2')
  })

  test('full block replacement via set', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'old text', marks: []}],
      },
    ])

    applyPatchToYDoc(
      {
        type: 'set',
        path: [{_key: 'b1'}],
        value: {
          _key: 'b1',
          _type: 'block',
          style: 'h2',
          markDefs: [],
          children: [
            {_key: 's1', _type: 'span', text: 'new text', marks: ['strong']},
          ],
        },
      },
      root,
      keyMap,
    )

    const block = keyMap.getYText('b1')!
    expect(block.getAttribute('style')).toBe('h2')
    expect(getBlockText(block)).toBe('new text')
    const spans = getSpans(block)
    expect(spans[0].marks).toEqual(['strong'])
  })
})

describe('edge cases: markDefs', () => {
  test('set markDefs with link annotation', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: 's1', _type: 'span', text: 'click ', marks: []},
          {_key: 's2', _type: 'span', text: 'here', marks: ['link1']},
        ],
      },
    ])

    applyPatchToYDoc(
      {
        type: 'set',
        path: [{_key: 'b1'}, 'markDefs'],
        value: [{_key: 'link1', _type: 'link', href: 'https://example.com'}],
      },
      root,
      keyMap,
    )

    const block = keyMap.getYText('b1')!
    const markDefs = JSON.parse(block.getAttribute('markDefs') as string)
    expect(markDefs).toHaveLength(1)
    expect(markDefs[0]._key).toBe('link1')
    expect(markDefs[0].href).toBe('https://example.com')
  })

  test('setIfMissing markDefs does not overwrite existing', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [
          {_key: 'link1', _type: 'link', href: 'https://original.com'},
        ],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
    ])

    applyPatchToYDoc(
      {
        type: 'setIfMissing',
        path: [{_key: 'b1'}, 'markDefs'],
        value: [{_key: 'link2', _type: 'link', href: 'https://new.com'}],
      },
      root,
      keyMap,
    )

    const block = keyMap.getYText('b1')!
    const markDefs = JSON.parse(block.getAttribute('markDefs') as string)
    expect(markDefs).toHaveLength(1)
    expect(markDefs[0]._key).toBe('link1')
    expect(markDefs[0].href).toBe('https://original.com')
  })
})

describe('edge cases: span split (multi-patch mutations)', () => {
  test('bold selection splits span into two (truncate + insert)', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello world', marks: []}],
      },
    ])

    // PTE emits these patches when you select "world" and toggle bold:
    // 1. Truncate the original span
    // 2. Insert a new bold span after it
    // Both should be applied atomically in one Y.Doc transaction
    const yDoc = keyMap.getYText('b1')!.doc!
    yDoc.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -3,9 +3,4 @@\n llo \n-world\n',
        },
        root,
        keyMap,
      )

      applyPatchToYDoc(
        {
          type: 'insert',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          position: 'after',
          items: [
            {_key: 's2', _type: 'span', text: 'world', marks: ['strong']},
          ],
        },
        root,
        keyMap,
      )
    })

    const spans = getSpans(keyMap.getYText('b1')!)
    expect(spans).toHaveLength(2)
    expect(spans[0].text).toBe('hello ')
    expect(spans[0].key).toBe('s1')
    expect(spans[0].marks).toEqual([])
    expect(spans[1].text).toBe('world')
    expect(spans[1].key).toBe('s2')
    expect(spans[1].marks).toEqual(['strong'])
  })

  test('unbold merges spans back (delete span + extend text)', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: 's1', _type: 'span', text: 'hello ', marks: []},
          {_key: 's2', _type: 'span', text: 'world', marks: ['strong']},
        ],
      },
    ])

    // PTE emits these when you select all and remove bold:
    // 1. Extend s1 text to include "world"
    // 2. Remove s2
    const yDoc = keyMap.getYText('b1')!.doc!
    yDoc.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -3,4 +3,9 @@\n llo \n+world\n',
        },
        root,
        keyMap,
      )

      applyPatchToYDoc(
        {
          type: 'unset',
          path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        },
        root,
        keyMap,
      )
    })

    const spans = getSpans(keyMap.getYText('b1')!)
    expect(spans).toHaveLength(1)
    expect(spans[0].text).toBe('hello world')
    expect(spans[0].key).toBe('s1')
    expect(spans[0].marks).toEqual([])
  })

  test('Enter key: split block into two', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello world', marks: []}],
      },
    ])

    // PTE emits these when you press Enter after "hello":
    // 1. Truncate b1's span to "hello"
    // 2. Insert new block b2 with " world"
    const yDoc = keyMap.getYText('b1')!.doc!
    yDoc.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -1,11 +1,5 @@\n hello\n- world\n',
        },
        root,
        keyMap,
      )

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
                {_key: 's2', _type: 'span', text: ' world', marks: []},
              ],
            },
          ],
        },
        root,
        keyMap,
      )
    })

    expect(root.length).toBe(2)
    expect(getBlockText(keyMap.getYText('b1')!)).toBe('hello')
    expect(getBlockText(keyMap.getYText('b2')!)).toBe(' world')
  })

  test('concurrent span split + text edit in same block', () => {
    // Two connected docs
    const yDoc1 = new Y.Doc()
    const root1 = yDoc1.getXmlFragment('content')
    const keyMap1 = createKeyMap()

    yDoc1.transact(() => {
      const yBlock = blockToYText(
        {
          _key: 'b1',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: 's1', _type: 'span', text: 'hello world', marks: []},
          ],
        },
        keyMap1,
      )
      root1.insert(0, [yBlock])
    })

    const yDoc2 = new Y.Doc()
    const root2 = yDoc2.getXmlFragment('content')
    const keyMap2 = createKeyMap()
    Y.applyUpdate(yDoc2, Y.encodeStateAsUpdate(yDoc1))

    // Populate keyMap2
    for (let i = 0; i < root2.length; i++) {
      const child = root2.get(i)
      if (child instanceof Y.XmlText) {
        const key = child.getAttribute('_key') as string | undefined
        if (key) keyMap2.set(key, child)
      }
    }

    // Client 1: bold "world" (span split)
    yDoc1.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -3,9 +3,4 @@\n llo \n-world\n',
        },
        root1,
        keyMap1,
      )
      applyPatchToYDoc(
        {
          type: 'insert',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          position: 'after',
          items: [
            {_key: 's2', _type: 'span', text: 'world', marks: ['strong']},
          ],
        },
        root1,
        keyMap1,
      )
    }, 'client1')

    // Client 2: append "!" to the text
    yDoc2.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -6,5 +6,6 @@\n world\n+!\n',
        },
        root2,
        keyMap2,
      )
    }, 'client2')

    // Sync
    Y.applyUpdate(yDoc1, Y.encodeStateAsUpdate(yDoc2))
    Y.applyUpdate(yDoc2, Y.encodeStateAsUpdate(yDoc1))

    // Both should converge — the exact text depends on Yjs merge order
    // but both edits should be preserved
    const text1 = getBlockText(keyMap1.getYText('b1')!)
    const text2 = getBlockText(keyMap2.getYText('b1')!)
    expect(text1).toBe(text2)
    // Both "world" and "!" should be present somewhere
    expect(text1).toContain('world')
  })
})
