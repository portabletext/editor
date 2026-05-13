import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {defineSchema} from '@portabletext/schema'
import {describe, expectTypeOf, test} from 'vitest'
import {defineContainer, defineLeaf} from './renderer.types'

describe(defineContainer.name, () => {
  test('accepts type, childField, and render (no schema)', () => {
    defineContainer({
      type: 'callout',
      childField: 'content',
      render: ({children}) => children,
    })
  })

  test('render gets isInline and parent as positional context', () => {
    defineContainer({
      type: 'callout',
      childField: 'content',
      render: ({isInline, parent, node}) => {
        expectTypeOf(isInline).toEqualTypeOf<boolean>()
        expectTypeOf(parent).toEqualTypeOf<
          PortableTextTextBlock | PortableTextObject | undefined
        >()
        expectTypeOf(node).toEqualTypeOf<
          PortableTextTextBlock | PortableTextObject
        >()
        return null
      },
    })
  })

  test('accepts renderChild without schema (any string keys)', () => {
    defineContainer({
      type: 'callout',
      childField: 'content',
      render: ({children}) => children,
      renderChild: {
        image: ({children}) => children,
        block: ({children}) => children,
      },
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

type Schema = typeof schema

describe('schema-aware defineContainer', () => {
  test('accepts top-level container type', () => {
    defineContainer<Schema>({
      type: 'callout',
      childField: 'content',
      render: ({children}) => children,
    })
  })

  test('rejects unknown container type', () => {
    defineContainer<Schema>({
      // @ts-expect-error - 'unknown' is not a registered container type
      type: 'unknown',
      childField: 'content',
      render: ({children}) => children,
    })
  })

  test('accepts nested container type', () => {
    defineContainer<Schema>({
      type: 'row',
      childField: 'cells',
      render: ({children}) => children,
    })
  })

  test('accepts deeply nested container type', () => {
    defineContainer<Schema>({
      type: 'cell',
      childField: 'content',
      render: ({children}) => children,
    })
  })

  test('accepts block container type with children field', () => {
    defineContainer<Schema>({
      type: 'block',
      childField: 'children',
      render: ({children, node}) => {
        // The block type's node is narrowed to a text block.
        expectTypeOf(node).toEqualTypeOf<PortableTextTextBlock>()
        return children
      },
    })
  })

  test('rejects unknown childField on a known type', () => {
    // @ts-expect-error - 'rows' is not a field on 'callout'
    defineContainer<Schema>({
      type: 'callout',
      childField: 'rows',
      render: ({children}) => children,
    })
  })

  test('rejects wrong childField for block container', () => {
    // @ts-expect-error - block's childField must be 'children'
    defineContainer<Schema>({
      type: 'block',
      childField: 'rows',
      render: ({children}) => children,
    })
  })

  test('accepts figure with multiple array fields', () => {
    defineContainer<Schema>({
      type: 'figure',
      childField: 'caption',
      render: ({children}) => children,
    })

    defineContainer<Schema>({
      type: 'figure',
      childField: 'tags',
      render: ({children}) => children,
    })

    defineContainer<Schema>({
      type: 'figure',
      // @ts-expect-error - 'alt' is a string, not an array field
      childField: 'alt',
      render: ({children}) => children,
    })
  })

  test('accepts renderChild keyed by block (the type declared in callout.content.of)', () => {
    defineContainer<Schema>({
      type: 'callout',
      childField: 'content',
      render: ({children}) => children,
      renderChild: {
        block: ({children}) => children,
      },
    })
  })

  test('rejects renderChild key that is not in field of', () => {
    defineContainer<Schema>({
      type: 'callout',
      childField: 'content',
      render: ({children}) => children,
      renderChild: {
        // @ts-expect-error - 'table' is not in callout.content.of
        table: ({children}) => children,
      },
    })
  })
})

describe(defineLeaf.name, () => {
  test('accepts type and render (no schema)', () => {
    defineLeaf({
      type: 'image',
      render: ({children}) => children,
    })
  })

  test('render gets isInline, parent, focused, readOnly, selected', () => {
    defineLeaf({
      type: 'image',
      render: ({isInline, parent, focused, readOnly, selected}) => {
        expectTypeOf(isInline).toEqualTypeOf<boolean>()
        expectTypeOf(parent).toEqualTypeOf<
          PortableTextTextBlock | PortableTextObject | undefined
        >()
        expectTypeOf(focused).toEqualTypeOf<boolean>()
        expectTypeOf(readOnly).toEqualTypeOf<boolean>()
        expectTypeOf(selected).toEqualTypeOf<boolean>()
        return null
      },
    })
  })
})
