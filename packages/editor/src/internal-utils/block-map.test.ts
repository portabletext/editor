import type {PortableTextBlock} from '@portabletext/schema'
import type {Operation as SlateOperation} from 'slate'
import {describe, expect, test} from 'vitest'
import {
  blockMapKey,
  buildBlockMap,
  updateBlockMap,
  type BlockMap,
} from './block-map'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function textBlock(key: string): PortableTextBlock {
  return {
    _key: key,
    _type: 'block',
    children: [{_key: `${key}-span`, _type: 'span', text: ''}],
    style: 'normal',
  }
}

function blockObject(key: string, type = 'image'): PortableTextBlock {
  return {
    _key: key,
    _type: type,
  }
}

/**
 * A container block with a `content` field holding nested blocks.
 * This is the shape containers will have.
 */
function containerBlock(
  key: string,
  contentBlocks: PortableTextBlock[],
  type = 'codeBlock',
): PortableTextBlock {
  return {
    _key: key,
    _type: type,
    content: contentBlocks,
  } as unknown as PortableTextBlock
}

/** Collect the reading-order keys by walking the linked list from the start. */
function readingOrder(blockMap: BlockMap): string[] {
  if (blockMap.size === 0) {
    return []
  }

  // Find the head (entry with prev === null)
  let headKey: string | null = null
  for (const [key, entry] of blockMap) {
    if (entry.prev === null) {
      headKey = key
      break
    }
  }

  if (headKey === null) {
    return []
  }

  const order: string[] = []
  let currentKey: string | null = headKey
  while (currentKey !== null) {
    order.push(currentKey)
    const entry = blockMap.get(currentKey)
    currentKey = entry?.next ?? null
  }

  return order
}

/** Assert the full state of the block map in one call. */
function expectBlockMap(
  blockMap: BlockMap,
  expected: Array<{
    key: string
    index: number
    prev: string | null
    next: string | null
    parent: string | null
    field: string | null
  }>,
) {
  expect(blockMap.size).toBe(expected.length)
  for (const exp of expected) {
    const entry = blockMap.get(exp.key)
    expect(entry, `entry for key "${exp.key}"`).toBeDefined()
    expect(entry!.index, `index for "${exp.key}"`).toBe(exp.index)
    expect(entry!.prev, `prev for "${exp.key}"`).toBe(exp.prev)
    expect(entry!.next, `next for "${exp.key}"`).toBe(exp.next)
    expect(entry!.parent, `parent for "${exp.key}"`).toBe(exp.parent)
    expect(entry!.field, `field for "${exp.key}"`).toBe(exp.field)
  }
}

// ---------------------------------------------------------------------------
// blockMapKey
// ---------------------------------------------------------------------------

describe('blockMapKey', () => {
  test('top-level block returns bare key', () => {
    expect(blockMapKey('abc123')).toBe('abc123')
  })

  test('top-level block with null parent returns bare key', () => {
    expect(blockMapKey('abc123', null, null)).toBe('abc123')
  })

  test('nested block encodes parent path', () => {
    const key = blockMapKey('block1', 'container1', 'content')
    expect(key).toBe('container1/7:content/6:block1')
  })

  test('deeply nested block encodes full path', () => {
    const level1 = blockMapKey('container1')
    const level2 = blockMapKey('row1', level1, 'content')
    const level3 = blockMapKey('cell1', level2, 'cells')
    const level4 = blockMapKey('block1', level3, 'content')

    expect(level1).toBe('container1')
    expect(level2).toBe('container1/7:content/4:row1')
    expect(level3).toBe('container1/7:content/4:row1/5:cells/5:cell1')
    expect(level4).toBe(
      'container1/7:content/4:row1/5:cells/5:cell1/7:content/6:block1',
    )
  })

  test('keys with special characters are unambiguous', () => {
    // Keys can contain slashes, colons, anything
    const key1 = blockMapKey('a/b', 'parent', 'field')
    const key2 = blockMapKey('ab', 'parent', 'field')
    expect(key1).not.toBe(key2)
  })

  test('length-prefix prevents collision between similar keys', () => {
    const key1 = blockMapKey('abc', 'p', 'f')
    const key2 = blockMapKey('ab', 'p', 'fc')
    expect(key1).not.toBe(key2)
  })
})

// ---------------------------------------------------------------------------
// buildBlockMap — flat documents
// ---------------------------------------------------------------------------

describe('buildBlockMap — flat documents', () => {
  test('empty document', () => {
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: []}, blockMap)
    expect(blockMap.size).toBe(0)
  })

  test('single block', () => {
    const blockMap: BlockMap = new Map()
    const value = [textBlock('a')]
    buildBlockMap({value}, blockMap)

    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: null, parent: null, field: null},
    ])
  })

  test('three blocks in reading order', () => {
    const blockMap: BlockMap = new Map()
    const value = [textBlock('a'), textBlock('b'), textBlock('c')]
    buildBlockMap({value}, blockMap)

    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'b', parent: null, field: null},
      {key: 'b', index: 1, prev: 'a', next: 'c', parent: null, field: null},
      {key: 'c', index: 2, prev: 'b', next: null, parent: null, field: null},
    ])

    expect(readingOrder(blockMap)).toEqual(['a', 'b', 'c'])
  })

  test('mixed text blocks and block objects', () => {
    const blockMap: BlockMap = new Map()
    const value = [textBlock('a'), blockObject('img1'), textBlock('b')]
    buildBlockMap({value}, blockMap)

    expect(readingOrder(blockMap)).toEqual(['a', 'img1', 'b'])
    expect(blockMap.get('img1')!.index).toBe(1)
  })

  test('rebuild clears previous state', () => {
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a'), textBlock('b')]}, blockMap)
    expect(blockMap.size).toBe(2)

    buildBlockMap({value: [textBlock('x')]}, blockMap)
    expect(blockMap.size).toBe(1)
    expect(blockMap.has('a')).toBe(false)
    expect(blockMap.has('x')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// updateBlockMap — surgical updates on flat documents
// ---------------------------------------------------------------------------

describe('updateBlockMap — flat documents', () => {
  test('set_selection is a no-op', () => {
    const blockMap: BlockMap = new Map()
    const value = [textBlock('a')]
    buildBlockMap({value}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'set_selection',
      properties: null,
      newProperties: {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 0},
      },
    } as SlateOperation)

    expect(result).toBe(false)
    expect(blockMap.size).toBe(1)
  })

  test('insert_text is a no-op', () => {
    const blockMap: BlockMap = new Map()
    const value = [textBlock('a')]
    buildBlockMap({value}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'insert_text',
      path: [0, 0],
      offset: 0,
      text: 'hello',
    } as SlateOperation)

    expect(result).toBe(false)
  })

  test('remove_text is a no-op', () => {
    const blockMap: BlockMap = new Map()
    const value = [textBlock('a')]
    buildBlockMap({value}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'remove_text',
      path: [0, 0],
      offset: 0,
      text: 'hello',
    } as SlateOperation)

    expect(result).toBe(false)
  })

  test('child-level insert_node is a no-op', () => {
    const blockMap: BlockMap = new Map()
    const value = [textBlock('a')]
    buildBlockMap({value}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'insert_node',
      path: [0, 1], // child level
      node: {_key: 'span2', _type: 'span', text: ''},
    } as SlateOperation)

    expect(result).toBe(false)
    expect(blockMap.size).toBe(1)
  })

  test('insert_node at end', () => {
    // Start: [a, b]
    // Insert c at index 2
    // Result: [a, b, c]
    const value = [textBlock('a'), textBlock('b'), textBlock('c')]
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a'), textBlock('b')]}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'insert_node',
      path: [2],
      node: textBlock('c'),
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'b', parent: null, field: null},
      {key: 'b', index: 1, prev: 'a', next: 'c', parent: null, field: null},
      {key: 'c', index: 2, prev: 'b', next: null, parent: null, field: null},
    ])
  })

  test('insert_node at start', () => {
    // Start: [b, c]
    // Insert a at index 0
    // Result: [a, b, c]
    const value = [textBlock('a'), textBlock('b'), textBlock('c')]
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('b'), textBlock('c')]}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'insert_node',
      path: [0],
      node: textBlock('a'),
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'b', parent: null, field: null},
      {key: 'b', index: 1, prev: 'a', next: 'c', parent: null, field: null},
      {key: 'c', index: 2, prev: 'b', next: null, parent: null, field: null},
    ])
  })

  test('insert_node in middle', () => {
    // Start: [a, c]
    // Insert b at index 1
    // Result: [a, b, c]
    const value = [textBlock('a'), textBlock('b'), textBlock('c')]
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a'), textBlock('c')]}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'insert_node',
      path: [1],
      node: textBlock('b'),
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'b', parent: null, field: null},
      {key: 'b', index: 1, prev: 'a', next: 'c', parent: null, field: null},
      {key: 'c', index: 2, prev: 'b', next: null, parent: null, field: null},
    ])
  })

  test('insert_node into empty document', () => {
    const value = [textBlock('a')]
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: []}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'insert_node',
      path: [0],
      node: textBlock('a'),
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: null, parent: null, field: null},
    ])
  })

  test('remove_node from end', () => {
    // Start: [a, b, c]
    // Remove c at index 2
    // Result: [a, b]
    const blockMap: BlockMap = new Map()
    buildBlockMap(
      {value: [textBlock('a'), textBlock('b'), textBlock('c')]},
      blockMap,
    )

    const value = [textBlock('a'), textBlock('b')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'remove_node',
      path: [2],
      node: textBlock('c'),
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'b', parent: null, field: null},
      {key: 'b', index: 1, prev: 'a', next: null, parent: null, field: null},
    ])
  })

  test('remove_node from start', () => {
    // Start: [a, b, c]
    // Remove a at index 0
    // Result: [b, c]
    const blockMap: BlockMap = new Map()
    buildBlockMap(
      {value: [textBlock('a'), textBlock('b'), textBlock('c')]},
      blockMap,
    )

    const value = [textBlock('b'), textBlock('c')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'remove_node',
      path: [0],
      node: textBlock('a'),
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'b', index: 0, prev: null, next: 'c', parent: null, field: null},
      {key: 'c', index: 1, prev: 'b', next: null, parent: null, field: null},
    ])
  })

  test('remove_node from middle', () => {
    // Start: [a, b, c]
    // Remove b at index 1
    // Result: [a, c]
    const blockMap: BlockMap = new Map()
    buildBlockMap(
      {value: [textBlock('a'), textBlock('b'), textBlock('c')]},
      blockMap,
    )

    const value = [textBlock('a'), textBlock('c')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'remove_node',
      path: [1],
      node: textBlock('b'),
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'c', parent: null, field: null},
      {key: 'c', index: 1, prev: 'a', next: null, parent: null, field: null},
    ])
  })

  test('remove last block', () => {
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a')]}, blockMap)

    const value: PortableTextBlock[] = []
    const result = updateBlockMap({value}, blockMap, {
      type: 'remove_node',
      path: [0],
      node: textBlock('a'),
    } as SlateOperation)

    expect(result).toBe(true)
    expect(blockMap.size).toBe(0)
  })

  test('split_node creates new block after split point', () => {
    // Start: [a, b]
    // Split a at [0] — creates new block at [1]
    // Result: [a, a2, b] (a2 is the new block from the split)
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a'), textBlock('b')]}, blockMap)

    const value = [textBlock('a'), textBlock('a2'), textBlock('b')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'split_node',
      path: [0],
      position: 1,
      properties: {_key: 'a2', _type: 'block'},
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'a2', parent: null, field: null},
      {key: 'a2', index: 1, prev: 'a', next: 'b', parent: null, field: null},
      {key: 'b', index: 2, prev: 'a2', next: null, parent: null, field: null},
    ])
  })

  test('split_node at end of document', () => {
    // Start: [a]
    // Split a — creates new block at [1]
    // Result: [a, a2]
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a')]}, blockMap)

    const value = [textBlock('a'), textBlock('a2')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'split_node',
      path: [0],
      position: 1,
      properties: {_key: 'a2', _type: 'block'},
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'a2', parent: null, field: null},
      {
        key: 'a2',
        index: 1,
        prev: 'a',
        next: null,
        parent: null,
        field: null,
      },
    ])
  })

  test('merge_node removes merged block', () => {
    // Start: [a, b, c]
    // Merge b into a (merge at [1])
    // Result: [a, c]
    const blockMap: BlockMap = new Map()
    buildBlockMap(
      {value: [textBlock('a'), textBlock('b'), textBlock('c')]},
      blockMap,
    )

    const value = [textBlock('a'), textBlock('c')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'merge_node',
      path: [1],
      position: 1,
      properties: {_key: 'b'},
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: 'c', parent: null, field: null},
      {key: 'c', index: 1, prev: 'a', next: null, parent: null, field: null},
    ])
  })

  test('merge_node down to single block', () => {
    // Start: [a, b]
    // Merge b into a
    // Result: [a]
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a'), textBlock('b')]}, blockMap)

    const value = [textBlock('a')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'merge_node',
      path: [1],
      position: 1,
      properties: {_key: 'b'},
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: null, parent: null, field: null},
    ])
  })

  test('set_node with key change re-keys entry', () => {
    // Block 'a' gets its key changed to 'a2'
    const blockMap: BlockMap = new Map()
    buildBlockMap(
      {value: [textBlock('a'), textBlock('b'), textBlock('c')]},
      blockMap,
    )

    const value = [textBlock('a2'), textBlock('b'), textBlock('c')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'set_node',
      path: [0],
      properties: {_key: 'a'},
      newProperties: {_key: 'a2'},
    } as SlateOperation)

    expect(result).toBe(true)
    expectBlockMap(blockMap, [
      {key: 'a2', index: 0, prev: null, next: 'b', parent: null, field: null},
      {key: 'b', index: 1, prev: 'a2', next: 'c', parent: null, field: null},
      {key: 'c', index: 2, prev: 'b', next: null, parent: null, field: null},
    ])
  })

  test('set_node without key change is a no-op', () => {
    const blockMap: BlockMap = new Map()
    const value = [textBlock('a')]
    buildBlockMap({value}, blockMap)

    const result = updateBlockMap({value}, blockMap, {
      type: 'set_node',
      path: [0],
      properties: {style: 'normal'},
      newProperties: {style: 'h1'},
    } as SlateOperation)

    expect(result).toBe(false)
  })

  test('move_node updates map correctly', () => {
    // Start: [a, b, c]
    // Move a to after c
    // Result: [b, c, a]
    const blockMap: BlockMap = new Map()
    buildBlockMap(
      {value: [textBlock('a'), textBlock('b'), textBlock('c')]},
      blockMap,
    )

    const value = [textBlock('b'), textBlock('c'), textBlock('a')]
    const result = updateBlockMap({value}, blockMap, {
      type: 'move_node',
      path: [0],
      newPath: [2],
    } as SlateOperation)

    expect(result).toBe(true)
    expect(readingOrder(blockMap)).toEqual(['b', 'c', 'a'])
    expect(blockMap.get('b')!.index).toBe(0)
    expect(blockMap.get('c')!.index).toBe(1)
    expect(blockMap.get('a')!.index).toBe(2)
  })

  test('sequential insert then remove', () => {
    // Start: [a, b]
    // Insert c at 1: [a, c, b]
    // Remove a at 0: [c, b]
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a'), textBlock('b')]}, blockMap)

    // Insert c at index 1
    let value: PortableTextBlock[] = [
      textBlock('a'),
      textBlock('c'),
      textBlock('b'),
    ]
    updateBlockMap({value}, blockMap, {
      type: 'insert_node',
      path: [1],
      node: textBlock('c'),
    } as SlateOperation)

    expect(readingOrder(blockMap)).toEqual(['a', 'c', 'b'])

    // Remove a at index 0
    value = [textBlock('c'), textBlock('b')]
    updateBlockMap({value}, blockMap, {
      type: 'remove_node',
      path: [0],
      node: textBlock('a'),
    } as SlateOperation)

    expectBlockMap(blockMap, [
      {key: 'c', index: 0, prev: null, next: 'b', parent: null, field: null},
      {key: 'b', index: 1, prev: 'c', next: null, parent: null, field: null},
    ])
  })

  test('sequential split then merge', () => {
    // Start: [a]
    // Split a: [a, a2]
    // Merge a2 back: [a]
    const blockMap: BlockMap = new Map()
    buildBlockMap({value: [textBlock('a')]}, blockMap)

    // Split
    let value: PortableTextBlock[] = [textBlock('a'), textBlock('a2')]
    updateBlockMap({value}, blockMap, {
      type: 'split_node',
      path: [0],
      position: 1,
      properties: {_key: 'a2', _type: 'block'},
    } as SlateOperation)

    expect(readingOrder(blockMap)).toEqual(['a', 'a2'])

    // Merge
    value = [textBlock('a')]
    updateBlockMap({value}, blockMap, {
      type: 'merge_node',
      path: [1],
      position: 1,
      properties: {_key: 'a2'},
    } as SlateOperation)

    expectBlockMap(blockMap, [
      {key: 'a', index: 0, prev: null, next: null, parent: null, field: null},
    ])
  })
})

// ---------------------------------------------------------------------------
// buildBlockMap — nested documents (containers)
// ---------------------------------------------------------------------------

describe('buildBlockMap — nested documents (future)', () => {
  // These tests document the expected behavior when buildBlockMap
  // is extended to walk into containers. They currently test the
  // flat-only behavior and will be updated when container walking
  // is implemented.

  test('container block appears in map as a single entry (flat walk)', () => {
    // Today, a container is just another block object in the flat array.
    // Its nested content is not walked.
    const blockMap: BlockMap = new Map()
    const value = [
      textBlock('a'),
      containerBlock('code1', [textBlock('line1'), textBlock('line2')]),
      textBlock('b'),
    ]
    buildBlockMap({value}, blockMap)

    // Only top-level blocks are in the map
    expect(blockMap.size).toBe(3)
    expect(readingOrder(blockMap)).toEqual(['a', 'code1', 'b'])
  })
})

// ---------------------------------------------------------------------------
// blockMapKey — collision resistance
// ---------------------------------------------------------------------------

describe('blockMapKey — collision resistance', () => {
  test('same key at different depths produces different map keys', () => {
    // Block "x" at root vs block "x" inside container "c1"
    const rootKey = blockMapKey('x')
    const nestedKey = blockMapKey('x', 'c1', 'content')

    expect(rootKey).not.toBe(nestedKey)
  })

  test('same key in different containers produces different map keys', () => {
    const inC1 = blockMapKey('x', 'c1', 'content')
    const inC2 = blockMapKey('x', 'c2', 'content')

    expect(inC1).not.toBe(inC2)
  })

  test('same key in different fields of same container produces different map keys', () => {
    const inContent = blockMapKey('x', 'c1', 'content')
    const inCaption = blockMapKey('x', 'c1', 'caption')

    expect(inContent).not.toBe(inCaption)
  })
})
