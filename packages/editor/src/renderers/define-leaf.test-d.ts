import {defineSchema} from '@portabletext/schema'
import {describe, test} from 'vitest'
import {defineLeaf} from './renderer.types'

describe(defineLeaf.name, () => {
  test('accepts any string scope without schema generic', () => {
    defineLeaf({
      scope: 'anything',
      render: ({children}) => children,
    })
  })
})

const schema = defineSchema({
  inlineObjects: [{name: 'stock-ticker'}, {name: 'mention'}],
  blockObjects: [
    {name: 'image'},
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'gallery',
      fields: [{name: 'images', type: 'array', of: [{type: 'image'}]}],
    },
  ],
})

type Schema = typeof schema

describe('schema-aware defineLeaf', () => {
  test("accepts 'span' as universal fallback", () => {
    defineLeaf<Schema>({
      scope: 'span',
      render: ({children}) => children,
    })
  })

  test('accepts inline object bare name', () => {
    defineLeaf<Schema>({
      scope: 'stock-ticker',
      render: ({children}) => children,
    })
  })

  test('rejects non-existent inline name', () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'unknown-inline' is not an inline object in schema
      scope: 'unknown-inline',
      render: ({children}) => children,
    })
  })

  test('accepts void block object name', () => {
    defineLeaf<Schema>({
      scope: 'image',
      render: ({children}) => children,
    })
  })

  test("accepts 'block.span' (root text block span override)", () => {
    defineLeaf<Schema>({
      scope: 'block.span',
      render: ({children}) => children,
    })
  })

  test("accepts 'block.stock-ticker' (root text block inline override)", () => {
    defineLeaf<Schema>({
      scope: 'block.stock-ticker',
      render: ({children}) => children,
    })
  })

  test("rejects 'block.wrong-name'", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'wrong-name' is not an inline object in schema
      scope: 'block.wrong-name',
      render: ({children}) => children,
    })
  })

  test("accepts 'callout.block.span' (scoped text block span)", () => {
    defineLeaf<Schema>({
      scope: 'callout.block.span',
      render: ({children}) => children,
    })
  })

  test("accepts 'callout.block.stock-ticker' (scoped text block inline)", () => {
    defineLeaf<Schema>({
      scope: 'callout.block.stock-ticker',
      render: ({children}) => children,
    })
  })

  test("rejects 'callout.wrong'", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'callout.wrong' is not a valid leaf scope
      scope: 'callout.wrong',
      render: ({children}) => children,
    })
  })

  test("rejects 'unknown'", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'unknown' is not in schema
      scope: 'unknown',
      render: ({children}) => children,
    })
  })

  test("rejects bare 'callout' (has array fields, so it is a container not a leaf)", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'callout' is a container, not a leaf
      scope: 'callout',
      render: ({children}) => children,
    })
  })

  test("rejects bare 'block' (container scope, not a leaf scope)", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'block' by itself is a container scope
      scope: 'block',
      render: ({children}) => children,
    })
  })

  test("rejects bare 'gallery' (has array fields, so it is a container not a leaf)", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'gallery' is a container, not a leaf
      scope: 'gallery',
      render: ({children}) => children,
    })
  })

  test("accepts 'gallery.image'", () => {
    defineLeaf<Schema>({
      scope: 'gallery.image',
      render: ({children}) => children,
    })
  })

  test("rejects 'gallery.images.image' (scope uses member type, not field name)", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - scope uses the member type ('image'), not the field name ('images')
      scope: 'gallery.images.image',
      render: ({children}) => children,
    })
  })

  test("rejects 'image.span' (image is void, has no inside)", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'image' has no children, can't scope into it
      scope: 'image.span',
      render: ({children}) => children,
    })
  })

  test("rejects 'gallery.image.span' (image inside gallery is void, has no inside)", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'image' is void even when nested in gallery
      scope: 'gallery.image.span',
      render: ({children}) => children,
    })
  })

  test("rejects 'block.image' (image is a block object, not an inline object)", () => {
    defineLeaf<Schema>({
      // @ts-expect-error - 'image' is not declared as an inline object in this schema
      scope: 'block.image',
      render: ({children}) => children,
    })
  })
})
