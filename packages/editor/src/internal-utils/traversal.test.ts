import {compileSchema, defineSchema} from '@portabletext/schema'
import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from './create-test-snapshot'
import {
  getAncestors,
  getChildren,
  getContainingContainer,
  getDepth,
  getNextBlock,
  getNextSibling,
  getNode,
  getParent,
  getPrevBlock,
  getPrevSibling,
  isDescendantOf,
  isNested,
} from './traversal'

function textBlock(key: string, text = ''): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-span`, text}],
    markDefs: [],
  }
}

function imageBlock(key: string): PortableTextBlock {
  return {_type: 'image', _key: key}
}

function container(
  key: string,
  type: string,
  fieldName: string,
  items: Array<PortableTextBlock>,
): PortableTextBlock {
  return {_type: type, _key: key, [fieldName]: items}
}

const schemaWithImage = compileSchema(
  defineSchema({
    blockObjects: [{name: 'image'}],
  }),
)

// -- Flat document (top-level only) --

const flatValue: Array<PortableTextBlock> = [
  textBlock('a'),
  textBlock('b'),
  imageBlock('img1'),
  textBlock('c'),
]

function flatSnapshot() {
  return createTestSnapshot({
    context: {value: flatValue, schema: schemaWithImage},
  })
}

// -- Deep document with nested containers --
// Structure:
//   p1 (text)
//   table-1 (container)
//     rows:
//       row-1 (container)
//         cells:
//           cell-1 (container)
//             content:
//               nested-p1 (text)
//               nested-p2 (text)
//           cell-2 (container)
//             content:
//               nested-p3 (text)
//       row-2 (container)
//         cells:
//           cell-3 (container)
//             content:
//               nested-p4 (text)
//               nested-img1 (block object)
//   p2 (text)
//   img-1 (block object)

const nestedP1 = textBlock('nested-p1', 'Cell 1 para 1')
const nestedP2 = textBlock('nested-p2', 'Cell 1 para 2')
const nestedP3 = textBlock('nested-p3', 'Cell 2 text')
const nestedP4 = textBlock('nested-p4', 'Row 2 text')
const nestedImg1 = imageBlock('nested-img1')

const cell1 = container('cell-1', 'cell', 'content', [nestedP1, nestedP2])
const cell2 = container('cell-2', 'cell', 'content', [nestedP3])
const cell3 = container('cell-3', 'cell', 'content', [nestedP4, nestedImg1])

const row1 = container('row-1', 'row', 'cells', [cell1, cell2])
const row2 = container('row-2', 'row', 'cells', [cell3])

const table1 = container('table-1', 'table', 'rows', [row1, row2])

const p1 = textBlock('p1', 'Before table')
const p2 = textBlock('p2', 'After table')
const img1 = imageBlock('img-1')

const deepValue: Array<PortableTextBlock> = [p1, table1, p2, img1]

function deepSnapshot() {
  return createTestSnapshot({
    context: {value: deepValue, schema: schemaWithImage},
  })
}

// Path helpers for readability
const pathP1 = [{_key: 'p1'}]
const pathP2 = [{_key: 'p2'}]
const pathImg1 = [{_key: 'img-1'}]
const pathTable1 = [{_key: 'table-1'}]
const pathRow1 = [{_key: 'table-1'}, 'rows', {_key: 'row-1'}]
const pathRow2 = [{_key: 'table-1'}, 'rows', {_key: 'row-2'}]
const pathCell1 = [
  {_key: 'table-1'},
  'rows',
  {_key: 'row-1'},
  'cells',
  {_key: 'cell-1'},
]
const pathCell2 = [
  {_key: 'table-1'},
  'rows',
  {_key: 'row-1'},
  'cells',
  {_key: 'cell-2'},
]
const pathCell3 = [
  {_key: 'table-1'},
  'rows',
  {_key: 'row-2'},
  'cells',
  {_key: 'cell-3'},
]
const pathNestedP1 = [
  {_key: 'table-1'},
  'rows',
  {_key: 'row-1'},
  'cells',
  {_key: 'cell-1'},
  'content',
  {_key: 'nested-p1'},
]
const pathNestedP2 = [
  {_key: 'table-1'},
  'rows',
  {_key: 'row-1'},
  'cells',
  {_key: 'cell-1'},
  'content',
  {_key: 'nested-p2'},
]
const pathNestedP3 = [
  {_key: 'table-1'},
  'rows',
  {_key: 'row-1'},
  'cells',
  {_key: 'cell-2'},
  'content',
  {_key: 'nested-p3'},
]
const pathNestedP4 = [
  {_key: 'table-1'},
  'rows',
  {_key: 'row-2'},
  'cells',
  {_key: 'cell-3'},
  'content',
  {_key: 'nested-p4'},
]
const pathNestedImg1 = [
  {_key: 'table-1'},
  'rows',
  {_key: 'row-2'},
  'cells',
  {_key: 'cell-3'},
  'content',
  {_key: 'nested-img1'},
]

describe('traversal', () => {
  // ---- getNode ----
  describe('getNode', () => {
    test('finds top-level text block', () => {
      const snapshot = flatSnapshot()
      expect(getNode(snapshot, [{_key: 'a'}])).toEqual({
        node: flatValue[0],
        path: [{_key: 'a'}],
      })
    })

    test('finds top-level block object', () => {
      const snapshot = flatSnapshot()
      expect(getNode(snapshot, [{_key: 'img1'}])).toEqual({
        node: flatValue[2],
        path: [{_key: 'img1'}],
      })
    })

    test('returns undefined for missing key', () => {
      const snapshot = flatSnapshot()
      expect(getNode(snapshot, [{_key: 'missing'}])).toEqual(undefined)
    })

    test('finds deeply nested block', () => {
      const snapshot = deepSnapshot()
      expect(getNode(snapshot, pathNestedP1)).toEqual({
        node: nestedP1,
        path: pathNestedP1,
      })
    })

    test('finds container itself', () => {
      const snapshot = deepSnapshot()
      expect(getNode(snapshot, pathTable1)).toEqual({
        node: table1,
        path: pathTable1,
      })
    })

    test('finds intermediate container', () => {
      const snapshot = deepSnapshot()
      expect(getNode(snapshot, pathRow1)).toEqual({
        node: row1,
        path: pathRow1,
      })
    })

    test('returns undefined for nonexistent nested key', () => {
      const snapshot = deepSnapshot()
      expect(
        getNode(snapshot, [{_key: 'table-1'}, 'rows', {_key: 'nonexistent'}]),
      ).toEqual(undefined)
    })
  })

  // ---- getParent ----
  describe('getParent', () => {
    test('returns undefined for top-level blocks', () => {
      const snapshot = flatSnapshot()
      expect(getParent(snapshot, [{_key: 'a'}])).toEqual(undefined)
      expect(getParent(snapshot, [{_key: 'b'}])).toEqual(undefined)
    })

    test('returns table for row', () => {
      const snapshot = deepSnapshot()
      expect(getParent(snapshot, pathRow1)).toEqual({
        node: table1,
        path: pathTable1,
      })
    })

    test('returns row for cell', () => {
      const snapshot = deepSnapshot()
      expect(getParent(snapshot, pathCell1)).toEqual({
        node: row1,
        path: pathRow1,
      })
    })

    test('returns cell for deeply nested text block', () => {
      const snapshot = deepSnapshot()
      expect(getParent(snapshot, pathNestedP1)).toEqual({
        node: cell1,
        path: pathCell1,
      })
    })

    test('returns undefined for top-level in deep document', () => {
      const snapshot = deepSnapshot()
      expect(getParent(snapshot, pathP1)).toEqual(undefined)
    })
  })

  // ---- getChildren ----
  describe('getChildren', () => {
    test('returns empty for text blocks', () => {
      const snapshot = flatSnapshot()
      expect(getChildren(snapshot, [{_key: 'a'}])).toEqual([])
    })

    test('returns empty for block objects', () => {
      const snapshot = flatSnapshot()
      expect(getChildren(snapshot, [{_key: 'img1'}])).toEqual([])
    })

    test('returns rows for table', () => {
      const snapshot = deepSnapshot()
      const children = getChildren(snapshot, pathTable1)
      expect(children).toEqual([
        {node: row1, path: pathRow1},
        {node: row2, path: pathRow2},
      ])
    })

    test('returns cells for row', () => {
      const snapshot = deepSnapshot()
      const children = getChildren(snapshot, pathRow1)
      expect(children).toEqual([
        {node: cell1, path: pathCell1},
        {node: cell2, path: pathCell2},
      ])
    })

    test('returns text blocks and block objects for cell', () => {
      const snapshot = deepSnapshot()
      const children = getChildren(snapshot, pathCell1)
      expect(children).toEqual([
        {node: nestedP1, path: pathNestedP1},
        {node: nestedP2, path: pathNestedP2},
      ])
    })

    test('returns mixed children for cell with block object', () => {
      const snapshot = deepSnapshot()
      const children = getChildren(snapshot, pathCell3)
      expect(children).toEqual([
        {node: nestedP4, path: pathNestedP4},
        {node: nestedImg1, path: pathNestedImg1},
      ])
    })

    test('returns empty for nested text block', () => {
      const snapshot = deepSnapshot()
      expect(getChildren(snapshot, pathNestedP1)).toEqual([])
    })

    test('returns empty for missing node', () => {
      const snapshot = deepSnapshot()
      expect(getChildren(snapshot, [{_key: 'missing'}])).toEqual([])
    })
  })

  // ---- getNextSibling ----
  describe('getNextSibling', () => {
    test('returns next top-level block', () => {
      const snapshot = flatSnapshot()
      expect(getNextSibling(snapshot, [{_key: 'a'}])).toEqual({
        node: flatValue[1],
        path: [{_key: 'b'}],
      })
    })

    test('returns undefined for last top-level block', () => {
      const snapshot = flatSnapshot()
      expect(getNextSibling(snapshot, [{_key: 'c'}])).toEqual(undefined)
    })

    test('returns next nested sibling', () => {
      const snapshot = deepSnapshot()
      expect(getNextSibling(snapshot, pathNestedP1)).toEqual({
        node: nestedP2,
        path: pathNestedP2,
      })
    })

    test('returns undefined for last nested sibling', () => {
      const snapshot = deepSnapshot()
      expect(getNextSibling(snapshot, pathNestedP2)).toEqual(undefined)
    })

    test('returns next cell sibling', () => {
      const snapshot = deepSnapshot()
      expect(getNextSibling(snapshot, pathCell1)).toEqual({
        node: cell2,
        path: pathCell2,
      })
    })

    test('returns next row sibling', () => {
      const snapshot = deepSnapshot()
      expect(getNextSibling(snapshot, pathRow1)).toEqual({
        node: row2,
        path: pathRow2,
      })
    })

    test('returns undefined for missing key', () => {
      const snapshot = deepSnapshot()
      expect(getNextSibling(snapshot, [{_key: 'missing'}])).toEqual(undefined)
    })
  })

  // ---- getPrevSibling ----
  describe('getPrevSibling', () => {
    test('returns previous top-level block', () => {
      const snapshot = flatSnapshot()
      expect(getPrevSibling(snapshot, [{_key: 'b'}])).toEqual({
        node: flatValue[0],
        path: [{_key: 'a'}],
      })
    })

    test('returns undefined for first top-level block', () => {
      const snapshot = flatSnapshot()
      expect(getPrevSibling(snapshot, [{_key: 'a'}])).toEqual(undefined)
    })

    test('returns previous nested sibling', () => {
      const snapshot = deepSnapshot()
      expect(getPrevSibling(snapshot, pathNestedP2)).toEqual({
        node: nestedP1,
        path: pathNestedP1,
      })
    })

    test('returns undefined for first nested sibling', () => {
      const snapshot = deepSnapshot()
      expect(getPrevSibling(snapshot, pathNestedP1)).toEqual(undefined)
    })

    test('returns previous cell sibling', () => {
      const snapshot = deepSnapshot()
      expect(getPrevSibling(snapshot, pathCell2)).toEqual({
        node: cell1,
        path: pathCell1,
      })
    })

    test('returns undefined for missing key', () => {
      const snapshot = deepSnapshot()
      expect(getPrevSibling(snapshot, [{_key: 'missing'}])).toEqual(undefined)
    })
  })

  // ---- getAncestors ----
  describe('getAncestors', () => {
    test('returns empty for top-level blocks', () => {
      const snapshot = flatSnapshot()
      expect(getAncestors(snapshot, [{_key: 'a'}])).toEqual([])
    })

    test('returns [table] for row', () => {
      const snapshot = deepSnapshot()
      expect(getAncestors(snapshot, pathRow1)).toEqual([
        {node: table1, path: pathTable1},
      ])
    })

    test('returns [table, row] for cell', () => {
      const snapshot = deepSnapshot()
      expect(getAncestors(snapshot, pathCell1)).toEqual([
        {node: table1, path: pathTable1},
        {node: row1, path: pathRow1},
      ])
    })

    test('returns [table, row, cell] for deeply nested text block', () => {
      const snapshot = deepSnapshot()
      expect(getAncestors(snapshot, pathNestedP1)).toEqual([
        {node: table1, path: pathTable1},
        {node: row1, path: pathRow1},
        {node: cell1, path: pathCell1},
      ])
    })

    test('returns ancestors for nested-p4 in second row', () => {
      const snapshot = deepSnapshot()
      expect(getAncestors(snapshot, pathNestedP4)).toEqual([
        {node: table1, path: pathTable1},
        {node: row2, path: pathRow2},
        {node: cell3, path: pathCell3},
      ])
    })
  })

  // ---- getNextBlock (cursor-order) ----
  describe('getNextBlock', () => {
    test('returns next leaf in flat document', () => {
      const snapshot = flatSnapshot()
      expect(getNextBlock(snapshot, [{_key: 'a'}])).toEqual({
        node: flatValue[1],
        path: [{_key: 'b'}],
      })
    })

    test('returns undefined at end of flat document', () => {
      const snapshot = flatSnapshot()
      expect(getNextBlock(snapshot, [{_key: 'c'}])).toEqual(undefined)
    })

    test('enters container from preceding block', () => {
      const snapshot = deepSnapshot()
      // p1 -> first leaf in table -> nested-p1
      expect(getNextBlock(snapshot, pathP1)).toEqual({
        node: nestedP1,
        path: pathNestedP1,
      })
    })

    test('moves to next sibling within cell', () => {
      const snapshot = deepSnapshot()
      expect(getNextBlock(snapshot, pathNestedP1)).toEqual({
        node: nestedP2,
        path: pathNestedP2,
      })
    })

    test('crosses cell boundary', () => {
      const snapshot = deepSnapshot()
      // nested-p2 (last in cell-1) -> nested-p3 (first in cell-2)
      expect(getNextBlock(snapshot, pathNestedP2)).toEqual({
        node: nestedP3,
        path: pathNestedP3,
      })
    })

    test('crosses row boundary', () => {
      const snapshot = deepSnapshot()
      // nested-p3 (last in row-1) -> nested-p4 (first in row-2)
      expect(getNextBlock(snapshot, pathNestedP3)).toEqual({
        node: nestedP4,
        path: pathNestedP4,
      })
    })

    test('skips block objects correctly in cursor order', () => {
      const snapshot = deepSnapshot()
      // nested-p4 -> nested-img1 (image is a leaf block object)
      expect(getNextBlock(snapshot, pathNestedP4)).toEqual({
        node: nestedImg1,
        path: pathNestedImg1,
      })
    })

    test('exits container to following block', () => {
      const snapshot = deepSnapshot()
      // nested-img1 (last in table) -> p2
      expect(getNextBlock(snapshot, pathNestedImg1)).toEqual({
        node: p2,
        path: pathP2,
      })
    })

    test('moves from text to block object', () => {
      const snapshot = deepSnapshot()
      // p2 -> img-1
      expect(getNextBlock(snapshot, pathP2)).toEqual({
        node: img1,
        path: pathImg1,
      })
    })

    test('returns undefined at end of deep document', () => {
      const snapshot = deepSnapshot()
      expect(getNextBlock(snapshot, pathImg1)).toEqual(undefined)
    })

    test('descends into container when given container path', () => {
      const snapshot = deepSnapshot()
      // table-1 -> first leaf -> nested-p1
      expect(getNextBlock(snapshot, pathTable1)).toEqual({
        node: nestedP1,
        path: pathNestedP1,
      })
    })

    test('returns undefined for missing key', () => {
      const snapshot = deepSnapshot()
      expect(getNextBlock(snapshot, [{_key: 'missing'}])).toEqual(undefined)
    })
  })

  // ---- getPrevBlock (cursor-order) ----
  describe('getPrevBlock', () => {
    test('returns previous leaf in flat document', () => {
      const snapshot = flatSnapshot()
      expect(getPrevBlock(snapshot, [{_key: 'b'}])).toEqual({
        node: flatValue[0],
        path: [{_key: 'a'}],
      })
    })

    test('returns undefined at start of flat document', () => {
      const snapshot = flatSnapshot()
      expect(getPrevBlock(snapshot, [{_key: 'a'}])).toEqual(undefined)
    })

    test('enters container from end', () => {
      const snapshot = deepSnapshot()
      // p2 -> last leaf in table -> nested-img1
      expect(getPrevBlock(snapshot, pathP2)).toEqual({
        node: nestedImg1,
        path: pathNestedImg1,
      })
    })

    test('moves to previous sibling within cell', () => {
      const snapshot = deepSnapshot()
      expect(getPrevBlock(snapshot, pathNestedP2)).toEqual({
        node: nestedP1,
        path: pathNestedP1,
      })
    })

    test('crosses cell boundary backward', () => {
      const snapshot = deepSnapshot()
      // nested-p3 (first in cell-2) -> nested-p2 (last in cell-1)
      expect(getPrevBlock(snapshot, pathNestedP3)).toEqual({
        node: nestedP2,
        path: pathNestedP2,
      })
    })

    test('crosses row boundary backward', () => {
      const snapshot = deepSnapshot()
      // nested-p4 (first in row-2) -> nested-p3 (last in row-1)
      expect(getPrevBlock(snapshot, pathNestedP4)).toEqual({
        node: nestedP3,
        path: pathNestedP3,
      })
    })

    test('exits container to top-level backward', () => {
      const snapshot = deepSnapshot()
      // nested-p1 (first in table) -> p1
      expect(getPrevBlock(snapshot, pathNestedP1)).toEqual({
        node: p1,
        path: pathP1,
      })
    })

    test('moves from block object to text', () => {
      const snapshot = deepSnapshot()
      // img-1 -> p2
      expect(getPrevBlock(snapshot, pathImg1)).toEqual({
        node: p2,
        path: pathP2,
      })
    })

    test('getPrevBlock from block object to text within cell', () => {
      const snapshot = deepSnapshot()
      // nested-img1 -> nested-p4
      expect(getPrevBlock(snapshot, pathNestedImg1)).toEqual({
        node: nestedP4,
        path: pathNestedP4,
      })
    })

    test('returns undefined at start of deep document', () => {
      const snapshot = deepSnapshot()
      expect(getPrevBlock(snapshot, pathP1)).toEqual(undefined)
    })

    test('returns undefined for missing key', () => {
      const snapshot = deepSnapshot()
      expect(getPrevBlock(snapshot, [{_key: 'missing'}])).toEqual(undefined)
    })
  })

  // ---- isNested ----
  describe('isNested', () => {
    test('returns false for top-level blocks', () => {
      const snapshot = flatSnapshot()
      expect(isNested(snapshot, [{_key: 'a'}])).toEqual(false)
    })

    test('returns true for nested blocks', () => {
      const snapshot = deepSnapshot()
      expect(isNested(snapshot, pathRow1)).toEqual(true)
      expect(isNested(snapshot, pathCell1)).toEqual(true)
      expect(isNested(snapshot, pathNestedP1)).toEqual(true)
    })

    test('returns false for top-level in deep document', () => {
      const snapshot = deepSnapshot()
      expect(isNested(snapshot, pathP1)).toEqual(false)
      expect(isNested(snapshot, pathTable1)).toEqual(false)
    })
  })

  // ---- getDepth ----
  describe('getDepth', () => {
    test('returns 0 for top-level blocks', () => {
      const snapshot = flatSnapshot()
      expect(getDepth(snapshot, [{_key: 'a'}])).toEqual(0)
    })

    test('returns 1 for row (one level deep)', () => {
      const snapshot = deepSnapshot()
      expect(getDepth(snapshot, pathRow1)).toEqual(1)
    })

    test('returns 2 for cell (two levels deep)', () => {
      const snapshot = deepSnapshot()
      expect(getDepth(snapshot, pathCell1)).toEqual(2)
    })

    test('returns 3 for deeply nested text block', () => {
      const snapshot = deepSnapshot()
      expect(getDepth(snapshot, pathNestedP1)).toEqual(3)
    })

    test('returns 0 for top-level in deep document', () => {
      const snapshot = deepSnapshot()
      expect(getDepth(snapshot, pathP1)).toEqual(0)
      expect(getDepth(snapshot, pathTable1)).toEqual(0)
    })
  })

  // ---- isDescendantOf ----
  describe('isDescendantOf', () => {
    test('returns false for top-level blocks', () => {
      const snapshot = flatSnapshot()
      expect(isDescendantOf(snapshot, [{_key: 'a'}], [{_key: 'b'}])).toEqual(
        false,
      )
    })

    test('returns false when paths are equal', () => {
      const snapshot = deepSnapshot()
      expect(isDescendantOf(snapshot, pathTable1, pathTable1)).toEqual(false)
    })

    test('returns true for row under table', () => {
      const snapshot = deepSnapshot()
      expect(isDescendantOf(snapshot, pathRow1, pathTable1)).toEqual(true)
    })

    test('returns true for deeply nested block under table', () => {
      const snapshot = deepSnapshot()
      expect(isDescendantOf(snapshot, pathNestedP1, pathTable1)).toEqual(true)
    })

    test('returns true for nested block under cell', () => {
      const snapshot = deepSnapshot()
      expect(isDescendantOf(snapshot, pathNestedP1, pathCell1)).toEqual(true)
    })

    test('returns false for unrelated paths', () => {
      const snapshot = deepSnapshot()
      expect(isDescendantOf(snapshot, pathP1, pathTable1)).toEqual(false)
    })

    test('returns false for sibling paths', () => {
      const snapshot = deepSnapshot()
      expect(isDescendantOf(snapshot, pathNestedP1, pathNestedP2)).toEqual(
        false,
      )
    })

    test('returns false for ancestor as descendant', () => {
      const snapshot = deepSnapshot()
      expect(isDescendantOf(snapshot, pathTable1, pathNestedP1)).toEqual(false)
    })
  })

  // ---- getContainingContainer ----
  describe('getContainingContainer', () => {
    test('returns undefined for top-level blocks', () => {
      const snapshot = flatSnapshot()
      expect(getContainingContainer(snapshot, [{_key: 'a'}])).toEqual(undefined)
    })

    test('returns undefined for top-level in deep document', () => {
      const snapshot = deepSnapshot()
      expect(getContainingContainer(snapshot, pathP1)).toEqual(undefined)
    })

    test('returns cell for deeply nested text block', () => {
      const snapshot = deepSnapshot()
      expect(getContainingContainer(snapshot, pathNestedP1)).toEqual({
        node: cell1,
        path: pathCell1,
      })
    })

    test('returns row for cell', () => {
      const snapshot = deepSnapshot()
      expect(getContainingContainer(snapshot, pathCell1)).toEqual({
        node: row1,
        path: pathRow1,
      })
    })

    test('returns table for row', () => {
      const snapshot = deepSnapshot()
      expect(getContainingContainer(snapshot, pathRow1)).toEqual({
        node: table1,
        path: pathTable1,
      })
    })

    test('returns undefined for top-level container', () => {
      const snapshot = deepSnapshot()
      expect(getContainingContainer(snapshot, pathTable1)).toEqual(undefined)
    })
  })
})
