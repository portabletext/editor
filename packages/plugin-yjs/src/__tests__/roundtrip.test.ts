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
 * Helper: get block attributes as a plain object.
 */
function getBlockAttrs(yBlock: Y.XmlText): Record<string, unknown> {
  return yBlock.getAttributes()
}

/**
 * Helper: get span delta entries from a block.
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
 * Helper: create a Y.Doc with blocks and return root + keyMap.
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

/**
 * Helper: sync two Y.Docs bidirectionally.
 */
function syncDocs(doc1: Y.Doc, doc2: Y.Doc): void {
  Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2))
  Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1))
}

/**
 * Helper: create a connected pair of Y.Docs with the same initial state.
 */
function createConnectedDocs(blocks: Array<Record<string, unknown>>): {
  doc1: Y.Doc
  root1: Y.XmlFragment
  keyMap1: KeyMap
  doc2: Y.Doc
  root2: Y.XmlFragment
  keyMap2: KeyMap
} {
  const {yDoc: doc1, root: root1, keyMap: keyMap1} = createDoc(blocks)

  const doc2 = new Y.Doc()
  const root2 = doc2.getXmlFragment('content')
  const keyMap2 = createKeyMap()

  // Sync initial state
  Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1))

  // Populate keyMap2 from synced doc
  for (let i = 0; i < root2.length; i++) {
    const child = root2.get(i)
    if (child instanceof Y.XmlText) {
      const key = child.getAttribute('_key') as string | undefined
      if (key) {
        keyMap2.set(key, child)
      }
    }
  }

  return {doc1, root1, keyMap1, doc2, root2, keyMap2}
}

describe('roundtrip: PT patch → Y.Doc → verify state', () => {
  test('diffMatchPatch roundtrip: text insertion', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
    ])

    applyPatchToYDoc(
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
        value: '@@ -1,5 +1,11 @@\n hello\n+ world\n',
      },
      root,
      keyMap,
    )

    const block = keyMap.getYText('b1')!
    expect(getBlockText(block)).toBe('hello world')
    const spans = getSpans(block)
    expect(spans).toHaveLength(1)
    expect(spans[0].key).toBe('s1')
    expect(spans[0].text).toBe('hello world')
  })

  test('set roundtrip: style change preserves text', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
    ])

    applyPatchToYDoc(
      {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'h1'},
      root,
      keyMap,
    )

    const block = keyMap.getYText('b1')!
    expect(getBlockAttrs(block)['style']).toBe('h1')
    expect(getBlockText(block)).toBe('hello')
  })

  test('insert + unset roundtrip: add then remove block', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'first', marks: []}],
      },
    ])

    // Insert a block
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
        ],
      },
      root,
      keyMap,
    )

    expect(root.length).toBe(2)

    // Remove it
    applyPatchToYDoc({type: 'unset', path: [{_key: 'b2'}]}, root, keyMap)

    expect(root.length).toBe(1)
    expect(keyMap.getYText('b2')).toBeUndefined()
    expect(getBlockText(keyMap.getYText('b1')!)).toBe('first')
  })

  test('marks roundtrip: bold then unbold', () => {
    const {root, keyMap} = createDoc([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
    ])

    // Add bold
    applyPatchToYDoc(
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'],
        value: ['strong'],
      },
      root,
      keyMap,
    )

    let spans = getSpans(keyMap.getYText('b1')!)
    expect(spans[0].marks).toEqual(['strong'])

    // Remove bold
    applyPatchToYDoc(
      {
        type: 'set',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'marks'],
        value: [],
      },
      root,
      keyMap,
    )

    spans = getSpans(keyMap.getYText('b1')!)
    expect(spans[0].marks).toEqual([])
  })
})

describe('concurrent editing via Y.Doc sync', () => {
  test('concurrent text edits in same block merge correctly', () => {
    const {doc1, root1, keyMap1, doc2, keyMap2} = createConnectedDocs([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
    ])

    // Client 1: append " world"
    doc1.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -1,5 +1,11 @@\n hello\n+ world\n',
        },
        root1,
        keyMap1,
      )
    }, 'client1')

    // Client 2: prepend "dear "
    const root2 = doc2.getXmlFragment('content')
    doc2.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -1,5 +1,10 @@\n+dear \n hello\n',
        },
        root2,
        keyMap2,
      )
    }, 'client2')

    // Before sync
    expect(getBlockText(keyMap1.getYText('b1')!)).toBe('hello world')
    expect(getBlockText(keyMap2.getYText('b1')!)).toBe('dear hello')

    // Sync
    syncDocs(doc1, doc2)

    // Both should converge to the same text
    const text1 = getBlockText(keyMap1.getYText('b1')!)
    const text2 = getBlockText(keyMap2.getYText('b1')!)
    expect(text1).toBe(text2)
    // Yjs preserves both edits
    expect(text1).toContain('dear')
    expect(text1).toContain('hello')
    expect(text1).toContain('world')
  })

  test('concurrent style changes: last write wins', () => {
    const {doc1, root1, keyMap1, doc2, keyMap2} = createConnectedDocs([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
    ])

    // Client 1: change to h1
    doc1.transact(() => {
      applyPatchToYDoc(
        {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'h1'},
        root1,
        keyMap1,
      )
    }, 'client1')

    // Client 2: change to h2
    const root2 = doc2.getXmlFragment('content')
    doc2.transact(() => {
      applyPatchToYDoc(
        {type: 'set', path: [{_key: 'b1'}, 'style'], value: 'h2'},
        root2,
        keyMap2,
      )
    }, 'client2')

    // Sync
    syncDocs(doc1, doc2)

    // Both should converge (one wins — Yjs uses last-writer-wins for attributes)
    const style1 = keyMap1.getYText('b1')!.getAttribute('style')
    const style2 = keyMap2.getYText('b1')!.getAttribute('style')
    expect(style1).toBe(style2)
  })

  test('concurrent block insert and text edit', () => {
    const {doc1, root1, keyMap1, doc2, keyMap2} = createConnectedDocs([
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
      },
    ])

    // Client 1: insert a new block
    doc1.transact(() => {
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
                {_key: 's2', _type: 'span', text: 'new block', marks: []},
              ],
            },
          ],
        },
        root1,
        keyMap1,
      )
    }, 'client1')

    // Client 2: edit text in existing block
    const root2 = doc2.getXmlFragment('content')
    doc2.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -1,5 +1,11 @@\n hello\n+ world\n',
        },
        root2,
        keyMap2,
      )
    }, 'client2')

    // Sync
    syncDocs(doc1, doc2)

    // Both docs should have 2 blocks with the text edit preserved
    expect(root1.length).toBe(2)
    expect(root2.length).toBe(2)
    expect(getBlockText(keyMap1.getYText('b1')!)).toBe('hello world')
  })

  test('concurrent block deletion and text edit', () => {
    const {doc1, root1, keyMap1, doc2, keyMap2} = createConnectedDocs([
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
    ])

    // Client 1: delete block b2
    doc1.transact(() => {
      applyPatchToYDoc({type: 'unset', path: [{_key: 'b2'}]}, root1, keyMap1)
    }, 'client1')

    // Client 2: edit text in block b1
    const root2 = doc2.getXmlFragment('content')
    doc2.transact(() => {
      applyPatchToYDoc(
        {
          type: 'diffMatchPatch',
          path: [{_key: 'b1'}, 'children', {_key: 's1'}, 'text'],
          value: '@@ -1,5 +1,14 @@\n first\n+ updated\n',
        },
        root2,
        keyMap2,
      )
    }, 'client2')

    // Sync
    syncDocs(doc1, doc2)

    // Both should have 1 block with the text edit
    expect(root1.length).toBe(1)
    expect(root2.length).toBe(1)
    expect(getBlockText(keyMap1.getYText('b1')!)).toContain('first')
    expect(getBlockText(keyMap1.getYText('b1')!)).toContain('updated')
  })
})
