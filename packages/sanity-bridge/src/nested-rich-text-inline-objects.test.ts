import {compileSchema} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import {builtinTypes} from '@sanity/schema/_internal'
import {describe, expect, test} from 'vitest'
import {sanitySchemaToPortableTextSchema} from './sanity-schema-to-portable-text-schema'

function distinctNodes(value: unknown, seen = new Set<object>()): number {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return 0
  }
  seen.add(value)
  let count = 1
  for (const child of Object.values(value)) {
    count += distinctNodes(child, seen)
  }
  return count
}

/**
 * A shared rich-text field whose block lists inline objects that each
 * carry the same rich-text field again, one of them three times. Every
 * nested block used to re-expand every inline object below it, so the
 * output multiplied per nesting level: two embedding types produced
 * millions of nodes and three exhausted the heap.
 */
function compileNestedRichText(embeddingTypeCount: number) {
  const inlineTypeNames = Array.from(
    {length: 8},
    (_, index) => `inlineType${index}`,
  )
  const blockContent = {
    name: 'blockContent',
    type: 'array',
    of: [
      {
        type: 'block',
        of: [
          {type: 'contentBlock'},
          ...inlineTypeNames.map((name) => ({type: name})),
        ],
      },
    ],
  }
  const contentBlock = {
    name: 'contentBlock',
    type: 'object',
    fields: [
      {name: 'title', type: 'string'},
      {...blockContent, name: 'blocks'},
      {...blockContent, name: 'blocksLeft'},
      {...blockContent, name: 'blocksRight'},
    ],
  }
  const inlineTypes = inlineTypeNames.map((name, index) => ({
    name,
    type: 'object',
    fields: [
      {name: 'label', type: 'string'},
      ...(index < embeddingTypeCount ? [{...blockContent, name: 'body'}] : []),
    ],
  }))
  const page = {
    name: 'page',
    type: 'document',
    fields: [{...blockContent, name: 'body'}],
  }
  const schema = SanitySchema.compile({
    name: 'nestedRichText',
    types: [page, contentBlock, ...inlineTypes, ...builtinTypes],
  })
  const pageType = schema.get('page') as {
    fields: Array<{name: string; type: unknown}>
  }
  return pageType.fields.find((field) => field.name === 'body')!
    .type as Parameters<typeof sanitySchemaToPortableTextSchema>[0]
}

describe('nested rich text inside inline objects', () => {
  test('Scenario: Inline objects shared by nested rich-text fields convert once', () => {
    for (const embeddingTypeCount of [0, 2, 4, 8]) {
      const start = performance.now()
      const converted = sanitySchemaToPortableTextSchema(
        compileNestedRichText(embeddingTypeCount),
      )
      const elapsed = performance.now() - start

      expect(elapsed, `${embeddingTypeCount} embedding types`).toBeLessThan(
        2_000,
      )
      expect(
        distinctNodes(converted),
        `${embeddingTypeCount} embedding types`,
      ).toBeLessThan(10_000)
      expect(() => compileSchema(converted)).not.toThrow()
    }
  })

  test('Scenario: A nested inline object keeps its fields', () => {
    const converted = sanitySchemaToPortableTextSchema(compileNestedRichText(2))
    const contentBlock = converted.inlineObjects.find(
      (inlineObject) => inlineObject.name === 'contentBlock',
    )!
    const nestedBlock = contentBlock.fields.find(
      (field) => field.name === 'blocks',
    ) as unknown as {
      of: Array<{
        type: string
        inlineObjects?: Array<{name: string; fields: Array<{name: string}>}>
      }>
    }
    const nestedInlineType = nestedBlock.of[0]!.inlineObjects!.find(
      (inlineObject) => inlineObject.name === 'inlineType0',
    )!

    expect(nestedInlineType.fields.map((field) => field.name)).toEqual([
      'label',
      'body',
    ])
  })
})
