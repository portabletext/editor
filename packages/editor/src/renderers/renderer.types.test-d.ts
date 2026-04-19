import {defineSchema} from '@portabletext/schema'
import {describe, test} from 'vitest'
import {defineContainer} from './renderer.types'

describe(defineContainer.name, () => {
  test('accepts scope, field, and render (no schema)', () => {
    defineContainer({
      scope: '$..callout',
      field: 'content',
      render: ({children}) => children,
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

type Schema = typeof schema

describe('schema-aware defineContainer', () => {
  test('accepts descendant scope on top-level container', () => {
    defineContainer<Schema>({
      scope: '$..callout',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('accepts root-anchored scope on top-level container', () => {
    defineContainer<Schema>({
      scope: '$.callout',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('rejects unknown type in scope', () => {
    defineContainer<Schema>({
      // @ts-expect-error - 'unknown' is not a type in schema
      scope: '$..unknown',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('rejects bare (unanchored) scope', () => {
    defineContainer<Schema>({
      // @ts-expect-error - bare scope missing $ anchor
      scope: 'callout',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('accepts nested container scope', () => {
    defineContainer<Schema>({
      scope: '$..table.row',
      field: 'cells',
      render: ({children}) => children,
    })
  })

  test('accepts deeply nested container scope', () => {
    defineContainer<Schema>({
      scope: '$..table.row.cell',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('accepts middle-descendant scope', () => {
    defineContainer<Schema>({
      scope: '$..table..cell',
      field: 'content',
      render: ({children}) => children,
    })
  })

  test('rejects bare nested type name', () => {
    defineContainer<Schema>({
      // @ts-expect-error - 'row' without $ prefix is invalid
      scope: 'row',
      field: 'cells',
      render: ({children}) => children,
    })
  })

  test('accepts block scope for text block children', () => {
    defineContainer<Schema>({
      scope: '$..block',
      field: 'children',
      render: ({children}) => children,
    })
  })

  test('accepts root-anchored block scope', () => {
    defineContainer<Schema>({
      scope: '$.block',
      field: 'children',
      render: ({children}) => children,
    })
  })

  test('accepts scoped block scope inside container', () => {
    defineContainer<Schema>({
      scope: '$..callout.block',
      field: 'children',
      render: ({children}) => children,
    })
  })

  test('accepts deeply scoped block scope', () => {
    defineContainer<Schema>({
      scope: '$..table.row.cell.block',
      field: 'children',
      render: ({children}) => children,
    })
  })

  test('accepts figure caption (valid array field of blocks)', () => {
    defineContainer<Schema>({
      scope: '$..figure',
      field: 'caption',
      render: ({children}) => children,
    })
  })

  test('rejects field not on the scoped type', () => {
    // @ts-expect-error - 'tags' is not a field on callout
    defineContainer<Schema>({
      scope: '$..callout',
      field: 'tags',
      render: ({children}) => children,
    })
  })

  test('rejects non-array field', () => {
    defineContainer<Schema>({
      scope: '$..figure',
      // @ts-expect-error - 'alt' is type: 'string', not an array
      field: 'alt',
      render: ({children}) => children,
    })
  })

  test('rejects wrong field for block scope', () => {
    // @ts-expect-error - block scope's field must be 'children'
    defineContainer<Schema>({
      scope: '$..block',
      field: 'content',
      render: ({children}) => children,
    })
  })
})
