import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import type {Path} from '../src/slate/interfaces/path'
import {createTestEditor} from '../src/test/vitest'

const calloutSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const tableSchema = defineSchema({
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

describe('container render focused, selected, and path', () => {
  test('Only the innermost container is focused; ancestors are selected', async () => {
    const calloutValues: Array<{
      focused: boolean
      selected: boolean
      path: Path
    }> = []
    const calloutBlockValues: Array<{
      focused: boolean
      selected: boolean
      path: Path
    }> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'callout',
          content: [
            {
              _type: 'block',
              _key: 'inner',
              children: [
                {_type: 'span', _key: 'span', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <ContainerPlugin
          containers={[
            defineContainer<typeof calloutSchema>({
              scope: '$..callout',
              field: 'content',
              render: ({attributes, children, focused, selected, path}) => {
                calloutValues.push({focused, selected, path})
                return <div {...attributes}>{children}</div>
              },
            }),
            defineContainer<typeof calloutSchema>({
              scope: '$..callout.block',
              field: 'children',
              render: ({attributes, children, focused, selected, path}) => {
                calloutBlockValues.push({focused, selected, path})
                return <div {...attributes}>{children}</div>
              },
            }),
          ]}
        />
      ),
    })

    const caret = {
      path: [
        {_key: 'callout'},
        'content',
        {_key: 'inner'},
        'children',
        {_key: 'span'},
      ],
      offset: 0,
    }
    editor.send({type: 'select', at: {anchor: caret, focus: caret}})

    await vi.waitFor(() => {
      expect(calloutBlockValues.at(-1)).toEqual({
        focused: true,
        selected: true,
        path: [{_key: 'callout'}, 'content', {_key: 'inner'}],
      })
      expect(calloutValues.at(-1)).toEqual({
        focused: false,
        selected: true,
        path: [{_key: 'callout'}],
      })
    })
  })

  test('A container is neither focused nor selected when the caret is in a different block', async () => {
    const calloutValues: Array<{focused: boolean; selected: boolean}> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: calloutSchema,
      initialValue: [
        {
          _type: 'block',
          _key: 'outside',
          children: [
            {_type: 'span', _key: 'outside-span', text: 'outside', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: 'callout',
          content: [
            {
              _type: 'block',
              _key: 'inner',
              children: [
                {_type: 'span', _key: 'inner-span', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <ContainerPlugin
          containers={[
            defineContainer<typeof calloutSchema>({
              scope: '$..callout',
              field: 'content',
              render: ({attributes, children, focused, selected}) => {
                calloutValues.push({focused, selected})
                return <div {...attributes}>{children}</div>
              },
            }),
          ]}
        />
      ),
    })

    const caret = {
      path: [{_key: 'outside'}, 'children', {_key: 'outside-span'}],
      offset: 0,
    }
    editor.send({type: 'select', at: {anchor: caret, focus: caret}})

    await vi.waitFor(() => {
      expect(calloutValues.at(-1)).toEqual({focused: false, selected: false})
    })
  })

  test('selected cascades up nested containers; focused stays on the innermost', async () => {
    const tableValues: Array<{focused: boolean; selected: boolean}> = []
    const rowValues: Array<{focused: boolean; selected: boolean}> = []
    const cellValues: Array<{focused: boolean; selected: boolean}> = []
    const cellBlockValues: Array<{focused: boolean; selected: boolean}> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: tableSchema,
      initialValue: [
        {
          _type: 'table',
          _key: 'table',
          rows: [
            {
              _type: 'row',
              _key: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell',
                  content: [
                    {
                      _type: 'block',
                      _key: 'block',
                      children: [
                        {
                          _type: 'span',
                          _key: 'span',
                          text: 'cell text',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <ContainerPlugin
          containers={[
            defineContainer<typeof tableSchema>({
              scope: '$..table',
              field: 'rows',
              render: ({attributes, children, focused, selected}) => {
                tableValues.push({focused, selected})
                return <div {...attributes}>{children}</div>
              },
            }),
            defineContainer<typeof tableSchema>({
              scope: '$..table.row',
              field: 'cells',
              render: ({attributes, children, focused, selected}) => {
                rowValues.push({focused, selected})
                return <div {...attributes}>{children}</div>
              },
            }),
            defineContainer<typeof tableSchema>({
              scope: '$..table.row.cell',
              field: 'content',
              render: ({attributes, children, focused, selected}) => {
                cellValues.push({focused, selected})
                return <div {...attributes}>{children}</div>
              },
            }),
            defineContainer<typeof tableSchema>({
              scope: '$..table.row.cell.block',
              field: 'children',
              render: ({attributes, children, focused, selected}) => {
                cellBlockValues.push({focused, selected})
                return <div {...attributes}>{children}</div>
              },
            }),
          ]}
        />
      ),
    })

    const caret = {
      path: [
        {_key: 'table'},
        'rows',
        {_key: 'row'},
        'cells',
        {_key: 'cell'},
        'content',
        {_key: 'block'},
        'children',
        {_key: 'span'},
      ],
      offset: 0,
    }
    editor.send({type: 'select', at: {anchor: caret, focus: caret}})

    await vi.waitFor(() => {
      expect(tableValues.at(-1)).toEqual({focused: false, selected: true})
      expect(rowValues.at(-1)).toEqual({focused: false, selected: true})
      expect(cellValues.at(-1)).toEqual({focused: false, selected: true})
      expect(cellBlockValues.at(-1)).toEqual({focused: true, selected: true})
    })
  })

  test('An expanded selection across cells marks both as selected and none as focused', async () => {
    const cellValues: Array<{
      key: string
      focused: boolean
      selected: boolean
    }> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: tableSchema,
      initialValue: [
        {
          _type: 'table',
          _key: 'table',
          rows: [
            {
              _type: 'row',
              _key: 'row',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'cell-1-block',
                      children: [
                        {
                          _type: 'span',
                          _key: 'cell-1-span',
                          text: 'cell 1',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'cell-2',
                  content: [
                    {
                      _type: 'block',
                      _key: 'cell-2-block',
                      children: [
                        {
                          _type: 'span',
                          _key: 'cell-2-span',
                          text: 'cell 2',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <ContainerPlugin
          containers={[
            defineContainer<typeof tableSchema>({
              scope: '$..table',
              field: 'rows',
              render: ({attributes, children}) => (
                <div {...attributes}>{children}</div>
              ),
            }),
            defineContainer<typeof tableSchema>({
              scope: '$..table.row',
              field: 'cells',
              render: ({attributes, children}) => (
                <div {...attributes}>{children}</div>
              ),
            }),
            defineContainer<typeof tableSchema>({
              scope: '$..table.row.cell',
              field: 'content',
              render: ({attributes, children, focused, selected, node}) => {
                cellValues.push({key: node._key, focused, selected})
                return <div {...attributes}>{children}</div>
              },
            }),
          ]}
        />
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'table'},
            'rows',
            {_key: 'row'},
            'cells',
            {_key: 'cell-1'},
            'content',
            {_key: 'cell-1-block'},
            'children',
            {_key: 'cell-1-span'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'table'},
            'rows',
            {_key: 'row'},
            'cells',
            {_key: 'cell-2'},
            'content',
            {_key: 'cell-2-block'},
            'children',
            {_key: 'cell-2-span'},
          ],
          offset: 6,
        },
      },
    })

    await vi.waitFor(() => {
      const cell1Last = [...cellValues]
        .reverse()
        .find((v) => v.key === 'cell-1')
      const cell2Last = [...cellValues]
        .reverse()
        .find((v) => v.key === 'cell-2')
      expect(cell1Last).toEqual({key: 'cell-1', focused: false, selected: true})
      expect(cell2Last).toEqual({key: 'cell-2', focused: false, selected: true})
    })
  })
})
