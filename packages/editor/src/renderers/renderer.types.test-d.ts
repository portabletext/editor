import {defineSchema} from '@portabletext/schema'
import type {ReactElement} from 'react'
import {describe, test} from 'vitest'
import {defineContainer, defineLeaf} from './renderer.types'

describe(defineContainer.name, () => {
  test('accepts scope, field, and render', () => {
    defineContainer({
      scope: 'callout',
      field: 'content',
      render: ({children, path: _path}) => children,
    })
  })
})

const schema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'figure',
      fields: [
        {name: 'caption', type: 'array', of: [{type: 'block'}]},
        {name: 'alt', type: 'string'},
        {name: 'tags', type: 'array', of: [{type: 'string'}]},
      ],
    },
    {name: 'image'},
    {
      name: 'gallery',
      fields: [{name: 'items', type: 'array', of: [{type: 'image'}]}],
    },
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
                          of: [{type: 'block'}, {type: 'image'}],
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
  inlineObjects: [{name: 'stock-ticker'}],
})

type Schema = typeof schema

describe('schema-aware defineContainer', () => {
  test('constrains scope to scoped type names', () => {
    defineContainer<Schema>({
      scope: 'callout',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('rejects scope not in schema', () => {
    defineContainer<Schema>({
      // @ts-expect-error - 'unknown' is not a scoped type name in schema
      scope: 'unknown',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('rejects field not on the type', () => {
    // @ts-expect-error - 'tags' is not an array field on callout
    defineContainer<Schema>({
      scope: 'callout',
      field: 'tags',
      render: ({children}) => children,
    })
  })

  test('rejects non-array fields', () => {
    defineContainer<Schema>({
      type: 'figure',
      // @ts-expect-error - 'alt' is type: 'string', not type: 'array'
      field: 'alt',
      render: ({children}) => children,
    })
  })

  test('allows valid array field', () => {
    defineContainer<Schema>({
      scope: 'figure',
      field: 'caption',
      render: ({children}) => children,
    })
  })

  test('accepts nested scoped type', () => {
    defineContainer<Schema>({
      scope: 'table.row',
      field: 'cells',
      render: ({children}) => children,
    })
  })

  test('accepts deeply nested scoped type', () => {
    defineContainer<Schema>({
      scope: 'table.row.cell',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('rejects bare nested type name', () => {
    defineContainer<Schema>({
      // @ts-expect-error - 'row' is not valid, must use 'table.row'
      scope: 'row',
      field: 'cells',
      render: ({children}) => children,
    })
  })

  test('constrains field to the scoped type', () => {
    // @ts-expect-error - 'content' is not a field on table.row (cells is)
    defineContainer<Schema>({
      scope: 'table.row',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('rejects bare deeply nested type name', () => {
    defineContainer<Schema>({
      // @ts-expect-error - 'cell' is not valid, must use 'table.row.cell'
      scope: 'cell',
      field: 'content',
      render: () => null as unknown as ReactElement,
    })
  })

  test('accepts block scope for text block children', () => {
    defineContainer<Schema>({
      scope: 'block',
      field: 'children',
      render: ({children}) => children,
    })
  })

  test('accepts scoped block scope inside container', () => {
    defineContainer<Schema>({
      scope: 'callout.block',
      field: 'children',
      render: ({children}) => children,
    })
  })

  test('accepts deeply scoped block scope', () => {
    defineContainer<Schema>({
      scope: 'table.row.cell.block',
      field: 'children',
      render: ({children}) => children,
    })
  })

  test('rejects invalid field on block scope', () => {
    // @ts-expect-error - 'content' is not valid on block scope, must be 'children'
    defineContainer<Schema>({
      scope: 'block',
      field: 'content',
      render: ({children}) => children,
    })
  })
})

describe(defineLeaf.name, () => {
  test('accepts scope and render', () => {
    defineLeaf({
      scope: 'block.span',
      render: ({children, path: _path}) => children,
    })
  })
})

describe('schema-aware defineLeaf', () => {
  test('accepts bare span scope', () => {
    defineLeaf<Schema>({
      scope: 'span',
      render: ({children}) => children,
    })
  })

  test('accepts block.span scope', () => {
    defineLeaf<Schema>({
      scope: 'block.span',
      render: ({children}) => children,
    })
  })

  test('accepts scoped span inside container', () => {
    defineLeaf<Schema>({
      scope: 'callout.block.span',
      render: ({children}) => children,
    })
  })

  test('accepts deeply scoped span', () => {
    defineLeaf<Schema>({
      scope: 'table.row.cell.block.span',
      render: ({children}) => children,
    })
  })

  test('accepts bare inline object scope', () => {
    defineLeaf<Schema>({
      scope: 'stock-ticker',
      render: ({children}) => children,
    })
  })

  test('accepts inline object in text block', () => {
    defineLeaf<Schema>({
      scope: 'block.stock-ticker',
      render: ({children}) => children,
    })
  })

  test('accepts inline object in container text block', () => {
    defineLeaf<Schema>({
      scope: 'callout.block.stock-ticker',
      render: ({children}) => children,
    })
  })

  test('accepts bare void block object scope', () => {
    defineLeaf<Schema>({
      scope: 'image',
      render: ({children}) => children,
    })
  })

  test('accepts void block object inside container', () => {
    defineLeaf<Schema>({
      scope: 'gallery.image',
      render: ({children}) => children,
    })
  })

  test('accepts void block object in table cell', () => {
    defineLeaf<Schema>({
      scope: 'table.row.cell.image',
      render: ({children}) => children,
    })
  })

  test('rejects scope not in schema', () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'unknown' is not a valid leaf scope
      scope: 'unknown',
      render: ({children}) => children,
    })
  })

  test('rejects container scope as leaf scope', () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'callout' is a container, not a leaf
      scope: 'callout',
      render: ({children}) => children,
    })
  })

  test('rejects bare nested type name', () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'row' is not valid, must use 'table.row.cell.block.span' etc.
      scope: 'row',
      render: ({children}) => children,
    })
  })
})
