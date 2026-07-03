import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * A document whose only block is a container used to trap the caret: arrow
 * navigation at the container's document-edge block was suppressed (built to
 * prevent the caret escaping into unmappable DOM), and clicks in the
 * editable's whitespace beyond the container had no block to land in. Block
 * objects already escape both ways, a new placeholder block gets inserted
 * beyond them, and containers get the same treatment.
 */

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const containers = [defineContainer({type: 'callout', arrayField: 'content'})]

const calloutBlock = {
  _type: 'callout',
  _key: 'c0',
  content: [
    {
      _type: 'block',
      _key: 'cb0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'cs0', text: 'AA', marks: []}],
    },
  ],
}

const leafPoint = (offset: number) => ({
  path: [{_key: 'c0'}, 'content', {_key: 'cb0'}, 'children', {_key: 'cs0'}],
  offset,
})

const emptyBlock = (blockKey: string, spanKey: string) => ({
  _type: 'block',
  _key: blockKey,
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
})

const arrowKey = (key: 'ArrowDown' | 'ArrowUp') => ({
  key,
  code: key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
})

async function createLonelyContainerEditor() {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: [calloutBlock],
    children: <NodePlugin nodes={containers} />,
  })
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  editor.send({type: 'focus'})
  return editor
}

async function placeCaret(
  editor: Awaited<ReturnType<typeof createLonelyContainerEditor>>,
  offset: number,
) {
  editor.send({
    type: 'select',
    at: {anchor: leafPoint(offset), focus: leafPoint(offset)},
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.focus.offset).toBe(offset)
  })
}

const gridSchema = defineSchema({
  blockObjects: [
    {
      name: 'grid',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'gridRow',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'gridCell',
                      fields: [
                        {name: 'value', type: 'array', of: [{type: 'block'}]},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const gridCell = (key: string) => ({
  _type: 'gridCell',
  _key: key,
  value: [
    {
      _type: 'block',
      _key: `b-${key}`,
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: `s-${key}`, text: 'x', marks: []}],
    },
  ],
})

const gridValue = [
  {
    _type: 'grid',
    _key: 'g0',
    rows: [
      {_type: 'gridRow', _key: 'r0', cells: [gridCell('c00')]},
      {_type: 'gridRow', _key: 'r1', cells: [gridCell('c10')]},
    ],
  },
]

async function createGridEditor() {
  return await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: gridSchema,
    initialValue: gridValue,
    children: (
      <NodePlugin
        nodes={[
          defineContainer({
            type: 'grid',
            arrayField: 'rows',
            of: [
              defineContainer({
                type: 'gridRow',
                arrayField: 'cells',
                of: [defineContainer({type: 'gridCell', arrayField: 'value'})],
              }),
            ],
          }),
        ]}
      />
    ),
  })
}

describe('escaping a container at the document edge', () => {
  test('ArrowDown at the end of a trailing container inserts a block after it', async () => {
    const editor = await createLonelyContainerEditor()
    await placeCaret(editor, 2)

    editor.send({type: 'keyboard.keydown', originEvent: arrowKey('ArrowDown')})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        calloutBlock,
        emptyBlock('k2', 'k3'),
      ])
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      })
    })
  })

  test('ArrowUp at the start of a leading container inserts a block before it', async () => {
    const editor = await createLonelyContainerEditor()
    await placeCaret(editor, 0)

    editor.send({type: 'keyboard.keydown', originEvent: arrowKey('ArrowUp')})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        emptyBlock('k2', 'k3'),
        calloutBlock,
      ])
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      })
    })
  })

  test('clicking below a trailing container inserts a block after it', async () => {
    const editor = await createLonelyContainerEditor()
    await placeCaret(editor, 1)

    editor.send({
      type: 'mouse.click',
      position: {
        block: 'end',
        isEditor: true,
        isContainer: false,
        selection: {anchor: leafPoint(2), focus: leafPoint(2)},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        calloutBlock,
        emptyBlock('k2', 'k3'),
      ])
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      })
    })
  })

  test('clicking above a leading container inserts a block before it', async () => {
    const editor = await createLonelyContainerEditor()
    await placeCaret(editor, 1)

    editor.send({
      type: 'mouse.click',
      position: {
        block: 'start',
        isEditor: true,
        isContainer: false,
        selection: {anchor: leafPoint(0), focus: leafPoint(0)},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        emptyBlock('k2', 'k3'),
        calloutBlock,
      ])
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      })
    })
  })

  test('clicking below a lonely container nested in a container inserts inside the outer one', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'box'}],
              },
            ],
          },
          {
            name: 'box',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: 'outer',
          content: [
            {
              _type: 'box',
              _key: 'inner',
              content: [
                {
                  _type: 'block',
                  _key: 'ib0',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'is0', text: 'AA', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({type: 'callout', arrayField: 'content'}),
            defineContainer({type: 'box', arrayField: 'content'}),
          ]}
        />
      ),
    })
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    editor.send({type: 'focus'})
    const innerLeaf = {
      path: [
        {_key: 'outer'},
        'content',
        {_key: 'inner'},
        'content',
        {_key: 'ib0'},
        'children',
        {_key: 'is0'},
      ],
      offset: 1,
    }
    editor.send({type: 'select', at: {anchor: innerLeaf, focus: innerLeaf}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(1)
    })

    // A click on the outer container's surface below the inner one: the
    // position's selection points at the clicked container itself.
    editor.send({
      type: 'mouse.click',
      position: {
        block: 'end',
        isEditor: false,
        isContainer: true,
        selection: {
          anchor: {path: [{_key: 'outer'}], offset: 0},
          focus: {path: [{_key: 'outer'}], offset: 0},
        },
      },
    })

    await vi.waitFor(() => {
      const outer = (
        editor.getSnapshot().context.value as Array<{
          content?: Array<{_type: string; _key: string}>
        }>
      )[0]
      // The new block lands inside the outer container, after the inner one.
      expect(outer?.content?.map((child) => child._type)).toEqual([
        'box',
        'block',
      ])
      expect(editor.getSnapshot().context.value).toHaveLength(1)
    })
  })

  test('arrows at a nested inner edge mid-container do not insert', async () => {
    // Three levels deep (table -> row -> cell shaped), the first cell of a
    // non-first row is the *nearest* container's start edge but not the
    // outer container's: native navigation stays inside. Measuring the
    // dead end at the nearest container declared every row's first and
    // last cell a dead end and inserted phantom blocks beside the table.
    const {editor, locator} = await createGridEditor()
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    editor.send({type: 'focus'})

    // The second row's cell: its block is the nearest container's edge
    // block in both directions, but mid-grid in the outer one.
    const innerPoint = (offset: number) => ({
      path: [
        {_key: 'g0'},
        'rows',
        {_key: 'r1'},
        'cells',
        {_key: 'c10'},
        'value',
        {_key: 'b-c10'},
        'children',
        {_key: 's-c10'},
      ],
      offset,
    })
    editor.send({
      type: 'select',
      at: {anchor: innerPoint(0), focus: innerPoint(0)},
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(
        innerPoint(0),
      )
    })

    editor.send({type: 'keyboard.keydown', originEvent: arrowKey('ArrowUp')})
    editor.send({type: 'keyboard.keydown', originEvent: arrowKey('ArrowDown')})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(gridValue)
    })
  })

  test('clicking a container whose array rejects text blocks never inserts inside it', async () => {
    // A table's rows array only accepts rows, so a click on the table's
    // own surface above or below the grid has no valid place for a
    // placeholder inside it and must leave the value alone. The editor
    // surface beyond the lonely table is a different place: the root
    // accepts text blocks, so that click still escapes.
    const {editor, locator} = await createGridEditor()
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    editor.send({type: 'focus'})

    const gridSurfacePoint = {path: [{_key: 'g0'}], offset: 0}
    for (const block of ['start', 'end'] as const) {
      editor.send({
        type: 'mouse.click',
        position: {
          block,
          isEditor: false,
          isContainer: true,
          selection: {anchor: gridSurfacePoint, focus: gridSurfacePoint},
        },
      })
    }

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(gridValue)
    })

    editor.send({
      type: 'mouse.click',
      position: {
        block: 'end',
        isEditor: true,
        isContainer: false,
        selection: {
          anchor: {
            path: [
              {_key: 'g0'},
              'rows',
              {_key: 'r1'},
              'cells',
              {_key: 'c10'},
              'value',
              {_key: 'b-c10'},
              'children',
              {_key: 's-c10'},
            ],
            offset: 1,
          },
          focus: {
            path: [
              {_key: 'g0'},
              'rows',
              {_key: 'r1'},
              'cells',
              {_key: 'c10'},
              'value',
              {_key: 'b-c10'},
              'children',
              {_key: 's-c10'},
            ],
            offset: 1,
          },
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        ...gridValue,
        emptyBlock('k2', 'k3'),
      ])
      expect(editor.getSnapshot().context.selection?.focus).toEqual({
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      })
    })
  })

  test('modified arrows at a dead end suppress instead of inserting', async () => {
    // Shift+Arrow extends the selection; at a container dead end the
    // behaviors still match (any modifier state) but only suppress, so no
    // placeholder is inserted.
    const editor = await createLonelyContainerEditor()
    await placeCaret(editor, 2)

    editor.send({
      type: 'keyboard.keydown',
      originEvent: {...arrowKey('ArrowDown'), shiftKey: true},
    })
    await placeCaret(editor, 0)
    editor.send({
      type: 'keyboard.keydown',
      originEvent: {...arrowKey('ArrowUp'), shiftKey: true},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([calloutBlock])
    })
  })

  test('ArrowDown does not insert when the container has a next sibling', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        calloutBlock,
        {
          _type: 'block',
          _key: 'b0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 's0', text: 'after', marks: []}],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: leafPoint(2), focus: leafPoint(2)},
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(2)
    })

    editor.send({type: 'keyboard.keydown', originEvent: arrowKey('ArrowDown')})

    await vi.waitFor(() => {
      // Native navigation handles the sibling case; no block is inserted.
      expect(editor.getSnapshot().context.value).toHaveLength(2)
    })
  })
})
