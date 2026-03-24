import {describe, expect, test} from 'vitest'
import {EDITOR_BRAND} from '../slate/editor/is-editor'
import type {Node} from '../slate/interfaces/node'
import {
  insertChildren,
  modifyChildren,
  modifyDescendant,
  modifyLeaf,
} from '../slate/utils/modify'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

function createMockEditor(
  testbed: ReturnType<typeof createNodeTraversalTestbed>,
) {
  const children = [...testbed.context.value]
  return {
    [EDITOR_BRAND]: true,
    children,
    get value() {
      return children
    },
    schema: testbed.schema,
    editableTypes: testbed.context.editableTypes,
  } as unknown as Node
}

/**
 * Tests for apply-operation's modify utils with container nodes.
 *
 * These tests exercise the same code paths that apply-operation uses
 * (modifyDescendant, modifyChildren, modifyLeaf) but with container
 * nodes (tables with rows/cells) where children live in schema-defined
 * fields like `rows`, `cells`, `content` instead of `children`.
 */
describe('modify with containers', () => {
  describe('modifyDescendant', () => {
    test('modify a span inside a table cell', () => {
      const testbed = createNodeTraversalTestbed()
      const editor = createMockEditor(testbed)

      // cellSpan1 is at [4, 0, 0, 0, 0]
      // table > row1 > cell1 > cellBlock1 > cellSpan1
      modifyDescendant(
        editor,
        [4, 0, 0, 0, 0],
        testbed.schema,
        (node: any) => ({
          ...node,
          text: 'modified',
        }),
      )

      const table = (editor as any).children.at(4)
      const row = table.rows.at(0)
      const cell = row.cells.at(0)
      const block = cell.content.at(0)
      const span = block.children.at(0)
      expect(span.text).toBe('modified')
    })

    test('modify a block inside a table cell', () => {
      const testbed = createNodeTraversalTestbed()
      const editor = createMockEditor(testbed)

      // cellBlock1 is at [4, 0, 0, 0]
      modifyDescendant(editor, [4, 0, 0, 0], testbed.schema, (node: any) => ({
        ...node,
        style: 'h1',
      }))

      const table = (editor as any).children.at(4)
      const row = table.rows.at(0)
      const cell = row.cells.at(0)
      const block = cell.content.at(0)
      expect(block.style).toBe('h1')
    })

    test('modify a row inside a table', () => {
      const testbed = createNodeTraversalTestbed()
      const editor = createMockEditor(testbed)

      // row1 is at [4, 0]
      modifyDescendant(editor, [4, 0], testbed.schema, (node: any) => ({
        ...node,
        highlighted: true,
      }))

      const table = (editor as any).children.at(4)
      const row = table.rows.at(0)
      expect(row.highlighted).toBe(true)
    })

    test('preserves sibling container fields when modifying a descendant', () => {
      const testbed = createNodeTraversalTestbed()
      const editor = createMockEditor(testbed)

      // Modify cellSpan1 at [4, 0, 0, 0, 0]
      modifyDescendant(
        editor,
        [4, 0, 0, 0, 0],
        testbed.schema,
        (node: any) => ({
          ...node,
          text: 'modified',
        }),
      )

      // cell2 at [4, 0, 1] should be untouched
      const table = (editor as any).children.at(4)
      const row = table.rows.at(0)
      const cell2 = row.cells.at(1)
      const block = cell2.content.at(0)
      expect(block.children.at(0).text).toBe('c')

      // row2 should be untouched
      const row2 = table.rows.at(1)
      expect(row2.cells.at(0).content.at(0).children.at(0).text).toBe('')
    })
  })

  describe('modifyChildren', () => {
    test('insert a block into a table cell', () => {
      const testbed = createNodeTraversalTestbed()
      const editor = createMockEditor(testbed)

      // cell1 is at [4, 0, 0], its children live in `content`
      const newBlock = {
        _key: 'new-block',
        _type: 'block',
        children: [{_key: 'new-span', _type: 'span', text: 'new'}],
      }

      modifyChildren(editor, [4, 0, 0], testbed.schema, (children) =>
        insertChildren(children, 1, newBlock),
      )

      const table = (editor as any).children.at(4)
      const row = table.rows.at(0)
      const cell = row.cells.at(0)
      expect(cell.content).toHaveLength(3)
      expect(cell.content.at(1)._key).toBe('new-block')
    })

    test('remove a cell from a table row', () => {
      const testbed = createNodeTraversalTestbed()
      const editor = createMockEditor(testbed)

      // row1 is at [4, 0], its children live in `cells`
      modifyChildren(editor, [4, 0], testbed.schema, (children) =>
        children.slice(0, 1),
      )

      const table = (editor as any).children.at(4)
      const row = table.rows.at(0)
      expect(row.cells).toHaveLength(1)
    })

    test('insert a row into a table', () => {
      const testbed = createNodeTraversalTestbed()
      const editor = createMockEditor(testbed)

      // table is at [4], its children live in `rows`
      const newRow = {
        _key: 'new-row',
        _type: 'row',
        cells: [],
      }

      modifyChildren(editor, [4], testbed.schema, (children) =>
        insertChildren(children, 1, newRow),
      )

      const table = (editor as any).children.at(4)
      expect(table.rows).toHaveLength(3)
      expect(table.rows.at(1)._key).toBe('new-row')
    })
  })

  describe('modifyLeaf', () => {
    test('modify a span inside a table cell', () => {
      const testbed = createNodeTraversalTestbed()
      const editor = createMockEditor(testbed)

      // cellSpan1 is at [4, 0, 0, 0, 0]
      modifyLeaf(editor, [4, 0, 0, 0, 0], testbed.schema, (span) => ({
        ...span,
        text: 'modified leaf',
      }))

      const table = (editor as any).children.at(4)
      const row = table.rows.at(0)
      const cell = row.cells.at(0)
      const block = cell.content.at(0)
      const span = block.children.at(0)
      expect(span.text).toBe('modified leaf')
    })
  })
})
