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
                  type: 'row',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [
                        {
                          type: 'cell',
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
    const tableContainer = defineContainer<typeof schemaDefinition>({
      scope: '$..table',
      field: 'rows',
      render: ({children, node}) => (
        <table data-testid={node._key}>
          <tbody>{children}</tbody>
        </table>
      ),
    })
    const rowContainer = defineContainer<typeof schemaDefinition>({
      scope: '$..table.row',
      field: 'cells',
      render: ({children}) => <tr>{children}</tr>,
    })
    const cellContainer = defineContainer<typeof schemaDefinition>({
      scope: '$..table.row.cell',
      field: 'content',
      render: ({children}) => <td>{children}</td>,
    })

    test('Inserting 1000 tables in an empty editor', async () => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: (
          <ContainerPlugin
            containers={[
              {container: tableContainer},
              {container: rowContainer},
              {container: cellContainer},
            ]}
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
    })

    test('Inserting 1000 tables before an existing block', async () => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: (
          <ContainerPlugin
            containers={[
              {container: tableContainer},
              {container: rowContainer},
              {container: cellContainer},
            ]}
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
    })

    test('Inserting 1000 tables after an existing block', async () => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: (
          <ContainerPlugin
            containers={[
              {container: tableContainer},
              {container: rowContainer},
              {container: cellContainer},
            ]}
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
    })
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
