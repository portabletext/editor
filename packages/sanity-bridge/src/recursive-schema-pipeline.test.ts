import {compileSchema} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import {expect, test} from 'vitest'
import {sanitySchemaToPortableTextSchema} from './sanity-schema-to-portable-text-schema'

/**
 * Regression test for the field-reported Studio freeze/OOM on doc-open
 * with a large mutually recursive block schema: ~25 members where several
 * container types recurse back into the shared Portable Text array.
 *
 * The conversion builds shared `OfDefinition` objects, so it is fast
 * regardless of the emitted shape; the failure lived in the output's
 * TREE size, which everything downstream walks. This test runs the
 * pipeline a studio runs, convert from the document field's type, then
 * `compileSchema`, and bounds both the tree size and the end-to-end
 * time. Before root block objects referenced by name at every position,
 * this shape exhausted the heap.
 */
test('a wide mutually recursive schema converts and compiles small and fast', () => {
  const containerCount = 25
  const types: Array<Record<string, unknown>> = []
  const memberRefs: Array<Record<string, unknown>> = [
    {
      type: 'block',
      marks: {
        annotations: Array.from({length: 8}, (_, index) => ({
          type: 'object',
          name: `annotation${index}`,
          fields: [{name: 'href', type: 'string'}],
        })),
      },
    },
  ]
  for (let index = 0; index < containerCount; index++) {
    types.push({
      type: 'object',
      name: `container${index}`,
      fields: [
        {name: 'label', type: 'string'},
        {name: 'content', type: 'blockContent'},
      ],
    })
    memberRefs.push({type: `container${index}`})
  }
  types.push({type: 'array', name: 'blockContent', of: memberRefs})
  types.push({
    type: 'document',
    name: 'article',
    fields: [{name: 'body', type: 'blockContent'}],
  })

  const sanitySchema = SanitySchema.compile({name: 'test', types})
  const article = sanitySchema.get('article') as unknown as {
    fields: Array<{name: string; type: unknown}>
  }
  const bodyType = article.fields.find((field) => field.name === 'body')!.type

  const startedAt = performance.now()
  const definition = sanitySchemaToPortableTextSchema(bodyType as never)
  const compiled = compileSchema(definition as never)
  const durationMs = performance.now() - startedAt

  expect(definition.blockObjects).toHaveLength(containerCount)
  expect(compiled.blockObjects).toHaveLength(containerCount)
  expect(JSON.stringify(definition).length).toBeLessThan(200_000)
  expect(durationMs).toBeLessThan(2_000)
})

/**
 * Root block objects are referenced by name at every nested position, but
 * the check is keyed by the compiled type instance, not the name: an
 * inline declaration that merely shares a root type's name is a different
 * instance and must keep its own inline shape. A name-keyed check would
 * stub it, and resolution would silently hand back the root type's
 * fields.
 */
test('an inline declaration sharing a root type name keeps its own shape', () => {
  const sanitySchema = SanitySchema.compile({
    name: 'test',
    types: [
      {
        type: 'array',
        name: 'blockContent',
        of: [{type: 'block'}, {type: 'card'}, {type: 'holder'}],
      },
      {
        type: 'object',
        name: 'card',
        fields: [{name: 'rootField', type: 'string'}],
      },
      {
        type: 'object',
        name: 'holder',
        fields: [
          {
            name: 'items',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'card',
                fields: [{name: 'nestedField', type: 'number'}],
              },
            ],
          },
        ],
      },
    ],
  })

  const definition = sanitySchemaToPortableTextSchema(
    sanitySchema.get('blockContent') as never,
  )

  const holder = definition.blockObjects.find(
    (blockObject) => blockObject.name === 'holder',
  )
  expect(holder).toEqual({
    name: 'holder',
    title: 'Holder',
    fields: [
      {
        name: 'items',
        type: 'array',
        title: 'Items',
        of: [
          {
            type: 'object',
            name: 'card',
            title: 'Card',
            fields: [
              {name: 'nestedField', type: 'number', title: 'Nested Field'},
            ],
          },
        ],
      },
    ],
  })

  const card = definition.blockObjects.find(
    (blockObject) => blockObject.name === 'card',
  )
  expect(card).toEqual({
    name: 'card',
    title: 'Card',
    fields: [{name: 'rootField', type: 'string', title: 'Root Field'}],
  })
})
