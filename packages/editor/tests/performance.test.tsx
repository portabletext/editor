import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {InternalSlateEditorRefPlugin} from '../src/plugins/plugin.internal.slate-editor-ref'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextSlateEditor} from '../src/types/slate-editor'

describe('Performance', () => {
  describe('Baseline', () => {
    test('Inserting 1000 blocks in an empty editor', async () => {
      const {editor, locator} = await createTestEditor()

      const start = performance.now()

      editor.send({
        type: 'insert.blocks',
        blocks: Array.from({length: 1000}, (_, i) => ({
          _type: 'block',
          children: [{_type: 'span', text: `b${i}`, marks: []}],
          markDefs: [],
          style: 'normal',
        })),
        placement: 'auto',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value.length).toBe(1000)

        expect(locator.getByText('b999')).toBeInTheDocument()
      })

      const duration = performance.now() - start

      console.warn(`Inserted 1000 blocks in ${duration.toFixed(2)}ms`)
    })

    test('Inserting 1000 blocks before an existing block', async () => {
      const {editor, locator} = await createTestEditor()

      const start = performance.now()

      editor.send({
        type: 'insert.blocks',
        blocks: Array.from({length: 1000}, (_, i) => ({
          _type: 'block',
          children: [{_type: 'span', text: `b${i}`, marks: []}],
          markDefs: [],
          style: 'normal',
        })),
        placement: 'before',
        at: {
          anchor: {path: [{_key: 'b0'}], offset: 0},
          focus: {path: [{_key: 'b0'}], offset: 0},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value.length).toBe(1001)

        expect(locator.getByText('b999')).toBeInTheDocument()
      })

      const duration = performance.now() - start

      console.warn(
        `Inserted 1000 blocks before an existing block in ${duration.toFixed(2)}ms`,
      )
    })

    test('Inserting 1000 blocks after an existing block', async () => {
      const {editor, locator} = await createTestEditor()

      const start = performance.now()

      editor.send({
        type: 'insert.blocks',
        blocks: Array.from({length: 1000}, (_, i) => ({
          _type: 'block',
          children: [{_type: 'span', text: `b${i}`, marks: []}],
          markDefs: [],
          style: 'normal',
        })),
        placement: 'after',
        at: {
          anchor: {path: [{_key: 'b0'}], offset: 0},
          focus: {path: [{_key: 'b0'}], offset: 0},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value.length).toBe(1001)

        expect(locator.getByText('b999')).toBeInTheDocument()
      })

      const duration = performance.now() - start

      console.warn(
        `Inserted 1000 blocks after an existing block in ${duration.toFixed(2)}ms`,
      )
    })
  })

  describe('Containers', () => {
    const schemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'table',
          fields: [
            {
              name: 'rows',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'row',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [
                        {
                          type: 'object',
                          name: 'cell',
                          fields: [
                            {
                              name: 'content',
                              type: 'array',
                              of: [{type: 'block'}],
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
        },
      ],
    })
    const tableContainer = defineContainer({
      type: 'table',
      childField: 'rows',
      render: ({children, node}) => (
        <table data-testid={node._key}>
          <tbody>{children}</tbody>
        </table>
      ),
    })
    const rowContainer = defineContainer({
      type: 'row',
      childField: 'cells',
      render: ({children}) => <tr>{children}</tr>,
    })
    const cellContainer = defineContainer({
      type: 'cell',
      childField: 'content',
      render: ({children}) => <td>{children}</td>,
    })

    test('Inserting 1000 tables in an empty editor', async () => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: (
          <ContainerPlugin
            containers={[tableContainer, rowContainer, cellContainer]}
          />
        ),
      })

      const start = performance.now()

      editor.send({
        type: 'insert.blocks',
        blocks: Array.from({length: 1000}, (_, i) => ({
          _type: 'table',
          _key: `t${i}`,
        })),
        placement: 'auto',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value.length).toBe(1000)

        expect(locator.getByTestId('t999')).toBeInTheDocument()
      })

      const duration = performance.now() - start

      console.warn(`Inserted 1000 tables in ${duration.toFixed(2)}ms`)
    }, 30_000)

    test('Inserting 1000 tables before an existing block', async () => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: (
          <ContainerPlugin
            containers={[tableContainer, rowContainer, cellContainer]}
          />
        ),
      })

      const start = performance.now()

      editor.send({
        type: 'insert.blocks',
        blocks: Array.from({length: 1000}, (_, i) => ({
          _type: 'table',
          _key: `t${i}`,
        })),
        placement: 'before',
        at: {
          anchor: {path: [{_key: 'b0'}], offset: 0},
          focus: {path: [{_key: 'b0'}], offset: 0},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value.length).toBe(1001)

        expect(locator.getByTestId('t999')).toBeInTheDocument()
      })

      const duration = performance.now() - start

      console.warn(
        `Inserted 1000 tables before an existing block in ${duration.toFixed(2)}ms`,
      )
    }, 30_000)

    test('Inserting 1000 tables after an existing block', async () => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: (
          <ContainerPlugin
            containers={[tableContainer, rowContainer, cellContainer]}
          />
        ),
      })

      const start = performance.now()

      editor.send({
        type: 'insert.blocks',
        blocks: Array.from({length: 1000}, (_, i) => ({
          _type: 'table',
          _key: `t${i}`,
        })),
        placement: 'after',
        at: {
          anchor: {path: [{_key: 'b0'}], offset: 0},
          focus: {path: [{_key: 'b0'}], offset: 0},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value.length).toBe(1001)

        expect(locator.getByTestId('t999')).toBeInTheDocument()
      })

      const duration = performance.now() - start

      console.warn(
        `Inserted 1000 tables after an existing block in ${duration.toFixed(2)}ms`,
      )
    }, 30_000)
  })

  describe('Deep nested containers', () => {
    // Recursive list schema: a list contains list-items, each list-item's
    // content can hold more lists. This matches the structured-lists shape
    // that surfaced the O(D^2) cost in the wild (holding Tab in a nested
    // list grows path depth by 2 per indent).
    const schemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'list',
          fields: [
            {
              name: 'items',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'list-item',
                  fields: [
                    {
                      name: 'content',
                      type: 'array',
                      of: [{type: 'block'}, {type: 'list'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    const listContainer = defineContainer({
      type: 'list',
      childField: 'items',
      render: ({children, node}) => (
        <ul data-testid={`list-${node._key}`}>{children}</ul>
      ),
    })
    const listItemContainer = defineContainer({
      type: 'list-item',
      childField: 'content',
      render: ({children, node}) => (
        <li data-testid={`li-${node._key}`}>{children}</li>
      ),
    })

    // Build a recursive list value of `depth` levels, ending in a single
    // text block at the deepest list-item.
    function buildNestedList(depth: number): Record<string, unknown> {
      let inner: Record<string, unknown> = {
        _type: 'block',
        _key: 'b0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's0', text: 'leaf', marks: []}],
      }
      for (let level = depth - 1; level >= 0; level--) {
        inner = {
          _type: 'list',
          _key: `l${level}`,
          items: [
            {
              _type: 'list-item',
              _key: `li${level}`,
              content: [inner],
            },
          ],
        }
      }
      return inner
    }

    // Drive N synthetic `set` events that replace the focused container's
    // content with a progressively deeper recursive-list value. The work
    // per iteration exercises the engine's set+normalize+render cost on
    // increasingly deep paths, which is the workload the O(D^2) -> O(D)
    // traversal fixes target. This is NOT a model of keyboard-driven tab
    // behavior - real tab moves one node per keystroke through plugin
    // behaviors. Use this scenario as a regression guard on set-on-deep-
    // paths, not as a predictor for keystroke-driven workloads.
    test('Setting progressively deeper nested list values', async () => {
      const INDENTS = 30

      // Build a starting value with two sibling list-items at top level,
      // so the second one can be sunk into the first.
      const initialValue = [
        {
          _type: 'list',
          _key: 'root',
          items: [
            {
              _type: 'list-item',
              _key: 'sink',
              content: [
                {
                  _type: 'block',
                  _key: 'sink-text',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'sink-span', text: 'sink', marks: []},
                  ],
                },
              ],
            },
            {
              _type: 'list-item',
              _key: 'item',
              content: [
                {
                  _type: 'block',
                  _key: 'item-text',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'item-span', text: 'item', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ]

      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        initialValue: initialValue as never,
        children: (
          <ContainerPlugin containers={[listContainer, listItemContainer]} />
        ),
      })
      await vi.waitFor(() =>
        expect(locator.getByTestId('li-item')).toBeInTheDocument(),
      )

      // Per-indent duration. We measure from editor.send through to the
      // DOM showing the new nesting depth, so React commit + selectors
      // are included.
      const durations: Array<number> = []

      for (let i = 0; i < INDENTS; i++) {
        const t0 = performance.now()

        // Each iteration replaces the sink list-item's content with a
        // fresh recursive list value one level deeper than the last,
        // via a single `set` event. The engine path exercised is:
        // operation apply on a deep path + normalize + React commit.
        const nestedItemContent = buildNestedList(i + 1)
        editor.send({
          type: 'set',
          at: [{_key: 'root'}, 'items', {_key: 'sink'}, 'content'],
          value: [nestedItemContent],
        } as never)

        await vi.waitFor(() =>
          expect(locator.getByTestId(`list-l${i}`)).toBeInTheDocument(),
        )
        durations.push(performance.now() - t0)
      }

      const total = durations.reduce((a, b) => a + b, 0)
      const max = Math.max(...durations)
      const last5 = durations.slice(-5)
      const last5Avg = last5.reduce((a, b) => a + b, 0) / last5.length

      console.warn(
        `Set deepening nested list ${INDENTS}x: total ${total.toFixed(0)}ms, max ${max.toFixed(0)}ms, last-5 avg ${last5Avg.toFixed(0)}ms`,
      )
    }, 60_000)
  })

  test('onChange is batched', async () => {
    const slateEditorRef = React.createRef<PortableTextSlateEditor>()
    let onChangeCount = 0

    const {editor} = await createTestEditor({
      children: <InternalSlateEditorRefPlugin ref={slateEditorRef} />,
    })

    const originalOnChange = slateEditorRef.current!.onChange

    slateEditorRef.current!.onChange = () => {
      onChangeCount++

      originalOnChange()
    }

    editor.send({
      type: 'insert.blocks',
      blocks: Array.from({length: 10}, (_, i) => ({
        _key: `k${i}`,
        _type: 'block',
        children: [
          {_key: `s${i}`, _type: 'span', text: `Block ${i}`, marks: []},
        ],
        markDefs: [],
        style: 'normal',
      })),
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value.length).toBe(10)
    })

    // We expect 2 calls:
    // 1. From performEvent (our batched call at the end of top-level event processing)
    // 2. From Slate-React's internal change detection
    expect(onChangeCount).toBe(2)
  })
})
