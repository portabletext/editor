import {
  compileSchema,
  getSubSchema,
  type OfDefinition,
} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import type {ArraySchemaType} from '@sanity/types'
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

test('Scenario: Rich text nested in inline objects that list fewer inline objects than the root converts small', () => {
  for (const embeddingTypeCount of [4, 5]) {
    const inlineObjectNames = Array.from(
      {length: embeddingTypeCount + 1},
      (_, index) => `inlineObject${index}`,
    )
    const sanitySchema = SanitySchema.compile({
      name: 'test',
      types: [
        {
          type: 'array',
          name: 'blockContent',
          of: [
            {
              type: 'block',
              of: inlineObjectNames.map((name) => ({type: name})),
            },
          ],
        },
        {
          type: 'array',
          name: 'richText',
          of: [
            {
              type: 'block',
              of: inlineObjectNames
                .slice(0, embeddingTypeCount)
                .map((name) => ({type: name})),
            },
          ],
        },
        ...inlineObjectNames.map((name, index) => ({
          type: 'object',
          name,
          fields: [
            {name: 'label', type: 'string'},
            ...(index < embeddingTypeCount
              ? [{name: 'body', type: 'richText'}]
              : []),
          ],
        })),
      ],
    })

    const definition = sanitySchemaToPortableTextSchema(
      sanitySchema.get('blockContent'),
    )

    expect(
      JSON.stringify(definition).length,
      `${embeddingTypeCount} embedding types`,
    ).toBeLessThan(500_000)
  }
})

test('Scenario: Rich text nested in its own inline objects keeps their fields at every depth', () => {
  const schema = compileSchema(
    sanitySchemaToPortableTextSchema(createSelfNestingRichText()),
  )
  const outerBodySchema = getSubSchema(
    schema,
    arrayFieldOf(schema.inlineObjects, 'inlineObject0', 'body'),
  )
  const innerBodySchema = getSubSchema(
    outerBodySchema,
    arrayFieldOf(outerBodySchema.inlineObjects, 'inlineObject1', 'body'),
  )

  expect(
    innerBodySchema.inlineObjects.find(
      (object) => object.name === 'inlineObject1',
    ),
  ).toEqual({
    name: 'inlineObject1',
    title: 'Inline Object 1',
    fields: [
      {name: 'label', type: 'string', title: 'Label'},
      {
        name: 'body',
        type: 'array',
        title: 'Body',
        of: [
          {
            type: 'block',
            styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
            lists: [],
            decorators: [],
          },
        ],
      },
    ],
  })
})

test('Scenario: Rich text nested in a narrower rich-text field resolves its own inline objects from the enclosing sub-schema', () => {
  const schema = compileSchema(
    sanitySchemaToPortableTextSchema(createSelfNestingRichText()),
  )
  const bodySchema = getSubSchema(
    schema,
    arrayFieldOf(schema.inlineObjects, 'inlineObject0', 'body'),
  )
  const asideSchema = getSubSchema(
    bodySchema,
    arrayFieldOf(bodySchema.inlineObjects, 'inlineObject3', 'aside'),
  )
  const asideBodySchema = getSubSchema(
    asideSchema,
    arrayFieldOf(asideSchema.inlineObjects, 'inlineObject0', 'body'),
  )

  expect(asideSchema.inlineObjects).toEqual([
    {
      name: 'inlineObject0',
      title: 'Inline Object 0',
      fields: [
        {name: 'label', type: 'string', title: 'Label'},
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
              annotations: [],
              inlineObjects: [
                {
                  name: 'inlineObject0',
                  title: 'Inline Object 0',
                  fields: [
                    {name: 'label', type: 'string', title: 'Label'},
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'inlineObject1',
                  title: 'Inline Object 1',
                  fields: [
                    {name: 'label', type: 'string', title: 'Label'},
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'inlineObject2',
                  title: 'Inline Object 2',
                  fields: [
                    {name: 'label', type: 'string', title: 'Label'},
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'inlineObject3',
                  title: 'Inline Object 3',
                  fields: [
                    {name: 'label', type: 'string', title: 'Label'},
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                        },
                      ],
                    },
                    {
                      name: 'aside',
                      type: 'array',
                      title: 'Aside',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                          annotations: [],
                          inlineObjects: [
                            {
                              name: 'inlineObject0',
                              title: 'Inline Object 0',
                              fields: [
                                {name: 'label', type: 'string', title: 'Label'},
                                {
                                  name: 'body',
                                  type: 'array',
                                  title: 'Body',
                                  of: [
                                    {
                                      type: 'block',
                                      styles: [
                                        {
                                          name: 'normal',
                                          title: 'Normal',
                                          value: 'normal',
                                        },
                                      ],
                                      lists: [],
                                      decorators: [],
                                      annotations: [],
                                      inlineObjects: [
                                        {
                                          name: 'inlineObject0',
                                          title: 'Inline Object 0',
                                          fields: [
                                            {
                                              name: 'label',
                                              type: 'string',
                                              title: 'Label',
                                            },
                                            {
                                              name: 'body',
                                              type: 'array',
                                              title: 'Body',
                                              of: [
                                                {
                                                  type: 'block',
                                                  styles: [
                                                    {
                                                      name: 'normal',
                                                      title: 'Normal',
                                                      value: 'normal',
                                                    },
                                                  ],
                                                  lists: [],
                                                  decorators: [],
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                        {
                                          name: 'inlineObject1',
                                          title: 'Inline Object 1',
                                          fields: [
                                            {
                                              name: 'label',
                                              type: 'string',
                                              title: 'Label',
                                            },
                                            {
                                              name: 'body',
                                              type: 'array',
                                              title: 'Body',
                                              of: [
                                                {
                                                  type: 'block',
                                                  styles: [
                                                    {
                                                      name: 'normal',
                                                      title: 'Normal',
                                                      value: 'normal',
                                                    },
                                                  ],
                                                  lists: [],
                                                  decorators: [],
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                        {
                                          name: 'inlineObject2',
                                          title: 'Inline Object 2',
                                          fields: [
                                            {
                                              name: 'label',
                                              type: 'string',
                                              title: 'Label',
                                            },
                                            {
                                              name: 'body',
                                              type: 'array',
                                              title: 'Body',
                                              of: [
                                                {
                                                  type: 'block',
                                                  styles: [
                                                    {
                                                      name: 'normal',
                                                      title: 'Normal',
                                                      value: 'normal',
                                                    },
                                                  ],
                                                  lists: [],
                                                  decorators: [],
                                                },
                                              ],
                                            },
                                          ],
                                        },
                                        {
                                          name: 'inlineObject3',
                                          title: 'Inline Object 3',
                                          fields: [],
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
                },
              ],
            },
          ],
        },
      ],
    },
  ])
  expect(asideBodySchema.inlineObjects).toEqual([
    {
      name: 'inlineObject0',
      title: 'Inline Object 0',
      fields: [
        {name: 'label', type: 'string', title: 'Label'},
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
            },
          ],
        },
      ],
    },
    {
      name: 'inlineObject1',
      title: 'Inline Object 1',
      fields: [
        {name: 'label', type: 'string', title: 'Label'},
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
            },
          ],
        },
      ],
    },
    {
      name: 'inlineObject2',
      title: 'Inline Object 2',
      fields: [
        {name: 'label', type: 'string', title: 'Label'},
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
            },
          ],
        },
      ],
    },
    {
      name: 'inlineObject3',
      title: 'Inline Object 3',
      fields: [
        {name: 'label', type: 'string', title: 'Label'},
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
            },
          ],
        },
        {
          name: 'aside',
          type: 'array',
          title: 'Aside',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
              annotations: [],
              inlineObjects: [
                {
                  name: 'inlineObject0',
                  title: 'Inline Object 0',
                  fields: [
                    {name: 'label', type: 'string', title: 'Label'},
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                          annotations: [],
                          inlineObjects: [
                            {
                              name: 'inlineObject0',
                              title: 'Inline Object 0',
                              fields: [
                                {name: 'label', type: 'string', title: 'Label'},
                                {
                                  name: 'body',
                                  type: 'array',
                                  title: 'Body',
                                  of: [
                                    {
                                      type: 'block',
                                      styles: [
                                        {
                                          name: 'normal',
                                          title: 'Normal',
                                          value: 'normal',
                                        },
                                      ],
                                      lists: [],
                                      decorators: [],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              name: 'inlineObject1',
                              title: 'Inline Object 1',
                              fields: [
                                {name: 'label', type: 'string', title: 'Label'},
                                {
                                  name: 'body',
                                  type: 'array',
                                  title: 'Body',
                                  of: [
                                    {
                                      type: 'block',
                                      styles: [
                                        {
                                          name: 'normal',
                                          title: 'Normal',
                                          value: 'normal',
                                        },
                                      ],
                                      lists: [],
                                      decorators: [],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              name: 'inlineObject2',
                              title: 'Inline Object 2',
                              fields: [
                                {name: 'label', type: 'string', title: 'Label'},
                                {
                                  name: 'body',
                                  type: 'array',
                                  title: 'Body',
                                  of: [
                                    {
                                      type: 'block',
                                      styles: [
                                        {
                                          name: 'normal',
                                          title: 'Normal',
                                          value: 'normal',
                                        },
                                      ],
                                      lists: [],
                                      decorators: [],
                                    },
                                  ],
                                },
                              ],
                            },
                            {
                              name: 'inlineObject3',
                              title: 'Inline Object 3',
                              fields: [],
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
    },
  ])
})

test("Scenario: Rich text inside a nested block's own members resolves the root lists when the block keeps only one of them", () => {
  const sanitySchema = SanitySchema.compile({
    name: 'test',
    types: [
      {
        type: 'array',
        name: 'richText',
        of: [
          textBlock(['note', 'tag'], ['link']),
          {type: 'aside'},
          {type: 'load'},
        ],
      },
      {
        type: 'array',
        name: 'withoutAnnotations',
        of: [textBlock(['note', 'tag'], [])],
      },
      {type: 'array', name: 'noteOnly', of: [textBlock(['note'], ['link'])]},
      {
        type: 'object',
        name: 'link',
        fields: [{name: 'body', type: 'richText'}],
      },
      {
        type: 'object',
        name: 'note',
        fields: [{name: 'body', type: 'richText'}],
      },
      {type: 'object', name: 'tag', fields: [{name: 'label', type: 'string'}]},
      {
        type: 'object',
        name: 'aside',
        fields: [
          {name: 'withoutAnnotations', type: 'withoutAnnotations'},
          {name: 'noteOnly', type: 'noteOnly'},
        ],
      },
      ...createBudgetExhaustingTypes(),
    ],
  })

  const schema = compileSchema(
    sanitySchemaToPortableTextSchema(sanitySchema.get('richText')),
  )
  const withoutAnnotationsSchema = getSubSchema(
    schema,
    arrayFieldOf(schema.blockObjects, 'aside', 'withoutAnnotations'),
  )
  const noteBodySchema = getSubSchema(
    withoutAnnotationsSchema,
    arrayFieldOf(withoutAnnotationsSchema.inlineObjects, 'note', 'body'),
  )
  const noteOnlySchema = getSubSchema(
    schema,
    arrayFieldOf(schema.blockObjects, 'aside', 'noteOnly'),
  )
  const linkBodySchema = getSubSchema(
    noteOnlySchema,
    arrayFieldOf(noteOnlySchema.annotations, 'link', 'body'),
  )

  expect(noteBodySchema.annotations).toEqual([
    {
      name: 'link',
      title: 'Link',
      fields: [
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
              annotations: [
                {
                  name: 'link',
                  title: 'Link',
                  fields: [
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                        },
                        {type: 'aside', title: 'Aside'},
                        {type: 'load', title: 'Load'},
                      ],
                    },
                  ],
                },
              ],
              inlineObjects: [
                {
                  name: 'note',
                  title: 'Note',
                  fields: [
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                        },
                        {type: 'aside', title: 'Aside'},
                        {type: 'load', title: 'Load'},
                      ],
                    },
                  ],
                },
                {
                  name: 'tag',
                  title: 'Tag',
                  fields: [{name: 'label', type: 'string', title: 'Label'}],
                },
              ],
            },
            {type: 'aside', title: 'Aside'},
            {type: 'load', title: 'Load'},
          ],
        },
      ],
    },
  ])
  expect(linkBodySchema.inlineObjects).toEqual([
    {
      name: 'note',
      title: 'Note',
      fields: [
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
              annotations: [
                {
                  name: 'link',
                  title: 'Link',
                  fields: [
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                        },
                        {type: 'aside', title: 'Aside'},
                        {type: 'load', title: 'Load'},
                      ],
                    },
                  ],
                },
              ],
              inlineObjects: [
                {
                  name: 'note',
                  title: 'Note',
                  fields: [
                    {
                      name: 'body',
                      type: 'array',
                      title: 'Body',
                      of: [
                        {
                          type: 'block',
                          styles: [
                            {name: 'normal', title: 'Normal', value: 'normal'},
                          ],
                          lists: [],
                          decorators: [],
                        },
                        {type: 'aside', title: 'Aside'},
                        {type: 'load', title: 'Load'},
                      ],
                    },
                  ],
                },
                {
                  name: 'tag',
                  title: 'Tag',
                  fields: [{name: 'label', type: 'string', title: 'Label'}],
                },
              ],
            },
            {type: 'aside', title: 'Aside'},
            {type: 'load', title: 'Load'},
          ],
        },
      ],
    },
    {
      name: 'tag',
      title: 'Tag',
      fields: [{name: 'label', type: 'string', title: 'Label'}],
    },
  ])
})

test('Scenario: Rich text inside an object-only array resolves the root lists without compileSchema', () => {
  const sanitySchema = SanitySchema.compile({
    name: 'test',
    types: [
      {
        type: 'array',
        name: 'richText',
        of: [textBlock(['note'], ['holder']), {type: 'card'}, {type: 'load'}],
      },
      {
        type: 'object',
        name: 'note',
        fields: [{name: 'body', type: 'richText'}],
      },
      {
        type: 'object',
        name: 'card',
        fields: [{name: 'body', type: 'richText'}],
      },
      {
        type: 'object',
        name: 'holder',
        fields: [
          {name: 'items', type: 'array', of: [{type: 'box'}, {type: 'card'}]},
        ],
      },
      {type: 'object', name: 'box', fields: [{name: 'body', type: 'richText'}]},
      ...createBudgetExhaustingTypes(),
    ],
  })

  const definition = sanitySchemaToPortableTextSchema(
    sanitySchema.get('richText'),
  )
  const itemsSchema = getSubSchema(
    definition,
    arrayFieldOf(definition.annotations, 'holder', 'items'),
  )
  const boxBodySchema = getSubSchema(
    itemsSchema,
    arrayFieldOf(itemsSchema.blockObjects, 'box', 'body'),
  )
  const cardBodySchema = getSubSchema(
    itemsSchema,
    arrayFieldOf(itemsSchema.blockObjects, 'card', 'body'),
  )

  expect(boxBodySchema.inlineObjects).toEqual([
    {
      name: 'note',
      title: 'Note',
      fields: [
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
            },
            {type: 'card', title: 'Card'},
            {type: 'load', title: 'Load'},
          ],
        },
      ],
    },
  ])
  expect(cardBodySchema.inlineObjects).toEqual([
    {
      name: 'note',
      title: 'Note',
      fields: [
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
            },
            {type: 'card', title: 'Card'},
            {type: 'load', title: 'Load'},
          ],
        },
      ],
    },
  ])
})

test('Scenario: Rich text inside an object type that a narrower block references by name resolves the root lists', () => {
  const sanitySchema = SanitySchema.compile({
    name: 'test',
    types: [
      {
        type: 'array',
        name: 'richText',
        of: [textBlock(['note'], ['link']), {type: 'load'}],
      },
      {
        type: 'array',
        name: 'withCard',
        of: [textBlock(['note'], ['link']), {type: 'card'}],
      },
      {
        type: 'array',
        name: 'narrow',
        of: [textBlock(['note'], []), {type: 'card'}],
      },
      {
        type: 'object',
        name: 'link',
        fields: [{name: 'body', type: 'withCard'}],
      },
      {
        type: 'object',
        name: 'card',
        fields: [
          {name: 'body', type: 'richText'},
          {name: 'aside', type: 'narrow'},
        ],
      },
      {
        type: 'object',
        name: 'note',
        fields: [{name: 'cards', type: 'array', of: [{type: 'card'}]}],
      },
      ...createBudgetExhaustingTypes(),
    ],
  })

  // The sub-schemas `parseBlocks` hands down along
  // `link.body > link.body > link.body > card.aside > note.cards > card.body`:
  // a block object parses against the schema of the position holding it,
  // and a bare reference resolves from the `blockObjects` of that schema.
  const schema = compileSchema(
    sanitySchemaToPortableTextSchema(sanitySchema.get('richText')),
  )
  const linkBodySchema = getSubSchema(
    schema,
    arrayFieldOf(schema.annotations, 'link', 'body'),
  )
  const nestedLinkBodySchema = getSubSchema(
    linkBodySchema,
    arrayFieldOf(linkBodySchema.annotations, 'link', 'body'),
  )
  const asideSchema = getSubSchema(
    nestedLinkBodySchema,
    arrayFieldOf(
      arrayFieldOf(nestedLinkBodySchema.annotations, 'link', 'body'),
      'card',
      'aside',
    ),
  )
  const cardBodySchema = getSubSchema(
    asideSchema,
    arrayFieldOf(asideSchema.blockObjects, 'card', 'body'),
  )

  expect(asideSchema.annotations).toEqual([])
  expect(arrayFieldOf(asideSchema.inlineObjects, 'note', 'cards')).toEqual([
    {type: 'card', title: 'Card'},
  ])
  expect(cardBodySchema.annotations).toEqual([
    {
      name: 'link',
      title: 'Link',
      fields: [
        {
          name: 'body',
          type: 'array',
          title: 'Body',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
              lists: [],
              decorators: [],
            },
            {type: 'card', title: 'Card'},
          ],
        },
      ],
    },
  ])
})

test('Scenario: An inline object with three rich-text fields sharing the root rich text converts small and keeps its fields', () => {
  for (const embeddingTypeCount of [2, 4, 8]) {
    const definition = sanitySchemaToPortableTextSchema(
      createLayoutRichText(embeddingTypeCount),
    )

    expect(
      JSON.stringify(definition).length,
      `${embeddingTypeCount} embedding types`,
    ).toBeLessThan(50_000)
  }

  const schema = compileSchema(
    sanitySchemaToPortableTextSchema(createLayoutRichText(2)),
  )
  const tertiarySchema = getSubSchema(
    schema,
    arrayFieldOf(schema.inlineObjects, 'layout', 'tertiary'),
  )

  expect(
    tertiarySchema.inlineObjects.find((object) => object.name === 'layout'),
  ).toEqual({
    name: 'layout',
    title: 'Layout',
    fields: [
      {name: 'title', type: 'string', title: 'Title'},
      {
        name: 'primary',
        type: 'array',
        title: 'Primary',
        of: [
          {
            type: 'block',
            styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
            lists: [],
            decorators: [],
          },
        ],
      },
      {
        name: 'secondary',
        type: 'array',
        title: 'Secondary',
        of: [
          {
            type: 'block',
            styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
            lists: [],
            decorators: [],
          },
        ],
      },
      {
        name: 'tertiary',
        type: 'array',
        title: 'Tertiary',
        of: [
          {
            type: 'block',
            styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
            lists: [],
            decorators: [],
          },
        ],
      },
    ],
  })
  expect(
    tertiarySchema.inlineObjects.find(
      (object) => object.name === 'inlineType0',
    ),
  ).toEqual({
    name: 'inlineType0',
    title: 'Inline Type 0',
    fields: [
      {name: 'label', type: 'string', title: 'Label'},
      {
        name: 'body',
        type: 'array',
        title: 'Body',
        of: [
          {
            type: 'block',
            styles: [{name: 'normal', title: 'Normal', value: 'normal'}],
            lists: [],
            decorators: [],
          },
        ],
      },
    ],
  })
})

function arrayFieldOf(
  members: ReadonlyArray<{name?: string; fields?: ReadonlyArray<unknown>}>,
  memberName: string,
  fieldName: string,
): ReadonlyArray<OfDefinition> {
  const field = members
    .find((member) => member.name === memberName)
    ?.fields?.find(
      (candidate) => (candidate as {name: string}).name === fieldName,
    ) as {of?: ReadonlyArray<OfDefinition>} | undefined
  return field?.of ?? []
}

function textBlock(inlineObjects: Array<string>, annotations: Array<string>) {
  return {
    type: 'block',
    styles: [{title: 'Normal', value: 'normal'}],
    lists: [],
    marks: {
      decorators: [],
      annotations: annotations.map((type) => ({type})),
    },
    of: inlineObjects.map((type) => ({type})),
  }
}

function createBudgetExhaustingTypes() {
  const inlineTypeNames = Array.from(
    {length: 5},
    (_, index) => `loadInline${index}`,
  )
  return [
    {type: 'object', name: 'load', fields: [{name: 'body', type: 'loadText'}]},
    {type: 'array', name: 'loadText', of: [textBlock(inlineTypeNames, [])]},
    ...inlineTypeNames.map((name) => ({
      type: 'object',
      name,
      fields: [{name: 'body', type: 'loadText'}],
    })),
  ]
}

function createSelfNestingRichText() {
  const textBlock = {
    type: 'block',
    styles: [{title: 'Normal', value: 'normal'}],
    lists: [],
    marks: {decorators: [], annotations: []},
  }
  const sanitySchema = SanitySchema.compile({
    name: 'test',
    types: [
      {
        type: 'array',
        name: 'richText',
        of: [
          {
            ...textBlock,
            of: [
              {type: 'inlineObject0'},
              {type: 'inlineObject1'},
              {type: 'inlineObject2'},
              {type: 'inlineObject3'},
            ],
          },
        ],
      },
      {
        type: 'array',
        name: 'narrowText',
        of: [{...textBlock, of: [{type: 'inlineObject0'}]}],
      },
      ...[0, 1, 2, 3].map((index) => ({
        type: 'object',
        name: `inlineObject${index}`,
        fields: [
          {name: 'label', type: 'string'},
          {name: 'body', type: 'richText'},
          ...(index === 3 ? [{name: 'aside', type: 'narrowText'}] : []),
        ],
      })),
    ],
  })
  return sanitySchema.get('richText')
}

function createLayoutRichText(embeddingTypeCount: number) {
  const inlineTypeNames = Array.from(
    {length: 8},
    (_, index) => `inlineType${index}`,
  )
  const richText = {
    type: 'array',
    name: 'richText',
    of: [textBlock(['layout', ...inlineTypeNames], [])],
  }
  const sanitySchema = SanitySchema.compile({
    name: 'test',
    types: [
      {
        type: 'document',
        name: 'article',
        fields: [{...richText, name: 'body'}],
      },
      {
        type: 'object',
        name: 'layout',
        fields: [
          {name: 'title', type: 'string'},
          {...richText, name: 'primary'},
          {...richText, name: 'secondary'},
          {...richText, name: 'tertiary'},
        ],
      },
      ...inlineTypeNames.map((name, index) => ({
        type: 'object',
        name,
        fields: [
          {name: 'label', type: 'string'},
          ...(index < embeddingTypeCount ? [{...richText, name: 'body'}] : []),
        ],
      })),
    ],
  })
  const article = sanitySchema.get('article') as {
    fields: Array<{name: string; type: ArraySchemaType}>
  }
  return article.fields.find((field) => field.name === 'body')!.type
}
