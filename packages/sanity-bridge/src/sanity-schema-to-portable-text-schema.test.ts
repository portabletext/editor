import {
  getSubSchema,
  type FieldDefinition,
  type OfDefinition,
  type Schema,
} from '@portabletext/schema'
import {Schema as SanitySchema} from '@sanity/schema'
import {builtinTypes} from '@sanity/schema/_internal'
import {
  defineArrayMember,
  defineField,
  defineType,
  type ArrayDefinition,
} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {
  sanitySchemaDefinitionToPortableTextSchema,
  sanitySchemaToPortableTextSchema,
} from './sanity-schema-to-portable-text-schema'

// The resolved sub-schema for an unmodified nested block member: the bridge
// emits each block member's own resolved lists, and an unmodified block
// resolves to Sanity's defaults.
const defaultBlockOfMember = {
  type: 'block',
  styles: [
    {name: 'normal', title: 'Normal', value: 'normal'},
    {name: 'h1', title: 'Heading 1', value: 'h1'},
    {name: 'h2', title: 'Heading 2', value: 'h2'},
    {name: 'h3', title: 'Heading 3', value: 'h3'},
    {name: 'h4', title: 'Heading 4', value: 'h4'},
    {name: 'h5', title: 'Heading 5', value: 'h5'},
    {name: 'h6', title: 'Heading 6', value: 'h6'},
    {name: 'blockquote', title: 'Quote', value: 'blockquote'},
  ],
  lists: [
    {name: 'bullet', title: 'Bulleted list', value: 'bullet'},
    {name: 'number', title: 'Numbered list', value: 'number'},
  ],
  decorators: [
    {name: 'strong', title: 'Strong', value: 'strong'},
    {name: 'em', title: 'Italic', value: 'em'},
    {name: 'code', title: 'Code', value: 'code'},
    {name: 'underline', title: 'Underline', value: 'underline'},
    {name: 'strike-through', title: 'Strike', value: 'strike-through'},
  ],
  annotations: [
    {
      name: 'link',
      title: 'Link',
      fields: [{name: 'href', title: 'Link', type: 'string'}],
    },
  ],
  inlineObjects: [],
}

describe(sanitySchemaToPortableTextSchema.name, () => {
  const defaultSchema: Schema = {
    block: {
      name: 'block',
    },
    span: {
      name: 'span',
    },
    styles: [
      {
        name: 'normal',
        value: 'normal',
        title: 'Normal',
      },
      {
        name: 'h1',
        value: 'h1',
        title: 'Heading 1',
      },
      {
        name: 'h2',
        value: 'h2',
        title: 'Heading 2',
      },
      {
        name: 'h3',
        value: 'h3',
        title: 'Heading 3',
      },
      {
        name: 'h4',
        value: 'h4',
        title: 'Heading 4',
      },
      {
        name: 'h5',
        value: 'h5',
        title: 'Heading 5',
      },
      {
        name: 'h6',
        value: 'h6',
        title: 'Heading 6',
      },
      {
        name: 'blockquote',
        value: 'blockquote',
        title: 'Quote',
      },
    ],
    lists: [
      {
        name: 'bullet',
        value: 'bullet',
        title: 'Bulleted list',
      },
      {
        name: 'number',
        value: 'number',
        title: 'Numbered list',
      },
    ],
    decorators: [
      {
        name: 'strong',
        value: 'strong',
        title: 'Strong',
      },
      {
        name: 'em',
        value: 'em',
        title: 'Italic',
      },
      {
        name: 'code',
        value: 'code',
        title: 'Code',
      },
      {
        name: 'underline',
        value: 'underline',
        title: 'Underline',
      },
      {
        name: 'strike-through',
        value: 'strike-through',
        title: 'Strike',
      },
    ],
    annotations: [
      {
        name: 'link',
        title: 'Link',
        fields: [
          {
            name: 'href',
            type: 'string',
            title: 'Link',
          },
        ],
      },
    ],
    blockObjects: [],
    inlineObjects: [],
  }

  test('simple compiled schema', () => {
    const sanitySchema = SanitySchema.compile({
      name: 'test',
      types: [
        defineArrayMember({
          type: 'array',
          name: 'content',
          of: [defineField({type: 'block', name: 'block'})],
        }),
      ],
    })

    expect(
      sanitySchemaToPortableTextSchema(sanitySchema.get('content')),
    ).toEqual(defaultSchema)
  })

  test('schema with built-in types', () => {
    const sanitySchema = SanitySchema.compile({
      name: 'test',
      types: [
        defineArrayMember({
          type: 'array',
          name: 'content',
          of: [
            defineField({
              type: 'block',
              name: 'block',
            }),
            defineField({type: 'image', name: 'image'}),
          ],
        }),
        ...builtinTypes,
      ],
    })

    expect(
      sanitySchemaToPortableTextSchema(sanitySchema.get('content'))
        .blockObjects,
    ).toEqual([
      {
        name: 'image',
        title: 'Image',
        fields: [
          {
            name: 'asset',
            title: 'Asset',
            type: 'object',
          },
          {
            name: 'media',
            title: 'Media',
            type: 'object',
          },
          {
            name: 'hotspot',
            title: 'Hotspot',
            type: 'object',
          },
          {
            name: 'crop',
            title: 'Crop',
            type: 'object',
          },
        ],
      },
    ])
  })

  test('simple array definition', () => {
    const sanitySchema: ArrayDefinition = {
      type: 'array',
      name: 'content',
      of: [defineField({type: 'block', name: 'block'})],
    }

    expect(sanitySchemaToPortableTextSchema(sanitySchema)).toEqual(
      defaultSchema,
    )
  })

  test('array definition with image', () => {
    const sanitySchema: ArrayDefinition = {
      type: 'array',
      name: 'content',
      of: [
        defineField({type: 'block', name: 'block'}),
        defineField({type: 'image', name: 'image'}),
      ],
    }

    expect(sanitySchemaToPortableTextSchema(sanitySchema)).toEqual({
      ...defaultSchema,
      blockObjects: [
        ...defaultSchema.blockObjects,
        {
          name: 'image',
          title: 'Image',
          fields: [
            {
              name: 'asset',
              title: 'Asset',
              type: 'object',
            },
            {
              name: 'media',
              title: 'Media',
              type: 'object',
            },
            {
              name: 'hotspot',
              title: 'Hotspot',
              type: 'object',
            },
            {
              name: 'crop',
              title: 'Crop',
              type: 'object',
            },
          ],
        },
      ],
    })
  })

  test('compiled schema with custom block and inline objects', () => {
    const imageType = defineType({
      name: 'custom image',
      type: 'object',
      fields: [
        defineField({
          name: 'url',
          type: 'string',
        }),
      ],
    })
    const stockTickerType = defineType({
      name: 'stock ticker',
      type: 'object',
      fields: [defineField({name: 'symbol', type: 'string'})],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        {
          type: 'block',
          name: 'block',
          of: [{type: 'stock ticker'}],
        },
        {type: 'custom image'},
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, imageType, stockTickerType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))

    expect(schema.blockObjects).toEqual([
      {
        name: 'custom image',
        title: 'Custom Image',
        fields: [
          {
            name: 'url',
            title: 'Url',
            type: 'string',
          },
        ],
      },
    ])
    expect(schema.inlineObjects).toEqual([
      {
        name: 'stock ticker',
        title: 'Stock Ticker',
        fields: [
          {
            name: 'symbol',
            title: 'Symbol',
            type: 'string',
          },
        ],
      },
    ])
  })

  test('compiled schema with a deep non-recursive structure unfolds fully', () => {
    // table-like nesting: table -> row -> cell -> block
    const cellType = defineType({
      type: 'object',
      name: 'cell',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [defineArrayMember({type: 'block', name: 'block'})],
        }),
      ],
    })
    const rowType = defineType({
      type: 'object',
      name: 'row',
      fields: [
        defineField({
          type: 'array',
          name: 'cells',
          of: [defineArrayMember({type: 'cell'})],
        }),
      ],
    })
    const tableType = defineType({
      type: 'object',
      name: 'table',
      fields: [
        defineField({
          type: 'array',
          name: 'rows',
          of: [defineArrayMember({type: 'row'})],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'table'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, tableType, rowType, cellType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const table = schema.blockObjects?.find((b) => b.name === 'table')

    expect(table?.fields).toEqual([
      {
        name: 'rows',
        type: 'array',
        title: 'Rows',
        of: [
          {
            type: 'object',
            name: 'row',
            title: 'Row',
            fields: [
              {
                name: 'cells',
                type: 'array',
                title: 'Cells',
                of: [
                  {
                    type: 'object',
                    name: 'cell',
                    title: 'Cell',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        title: 'Content',
                        of: [defaultBlockOfMember],
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

  test('compiled schema with a deeply nested table that contains itself in cells unfolds until the recursion is detected', () => {
    const cellType = defineType({
      type: 'object',
      name: 'cell',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'table'}),
          ],
        }),
      ],
    })
    const rowType = defineType({
      type: 'object',
      name: 'row',
      fields: [
        defineField({
          type: 'array',
          name: 'cells',
          of: [defineArrayMember({type: 'cell'})],
        }),
      ],
    })
    const tableType = defineType({
      type: 'object',
      name: 'table',
      fields: [
        defineField({
          type: 'array',
          name: 'rows',
          of: [defineArrayMember({type: 'row'})],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'table'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, tableType, rowType, cellType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const table = schema.blockObjects?.find((b) => b.name === 'table')

    // The nested `table` member inside a cell's `content` is detected as
    // a cycle (its name is already an ancestor on the walk) and emitted
    // as a stub `{type, name, title}` without fields. Everything before
    // that point unfolds fully.
    expect(table?.fields).toEqual([
      {
        name: 'rows',
        type: 'array',
        title: 'Rows',
        of: [
          {
            type: 'object',
            name: 'row',
            title: 'Row',
            fields: [
              {
                name: 'cells',
                type: 'array',
                title: 'Cells',
                of: [
                  {
                    type: 'object',
                    name: 'cell',
                    title: 'Cell',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        title: 'Content',
                        of: [
                          defaultBlockOfMember,
                          {type: 'table', title: 'Table'},
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

  test('compiled schema with a recursive object type unfolds until the recursion is detected', () => {
    // canvas's `canvasAiTask` shape: a block-object whose `input` field is
    // an array that contains the same type as a member, so the hydrated
    // sanity schema is a cycle.
    const aiTaskType = defineType({
      type: 'object',
      name: 'aiTask',
      fields: [
        defineField({name: 'instruction', type: 'string'}),
        defineField({
          type: 'array',
          name: 'input',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'aiTask'}),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'aiTask'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, aiTaskType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const aiTask = schema.blockObjects?.find((b) => b.name === 'aiTask')

    // The nested `aiTask` reference inside `input.of` is detected as a
    // cycle (its name is already an ancestor on the walk) and emitted
    // as a stub `{type, name, title}` without fields.
    expect(aiTask?.fields).toEqual([
      {name: 'instruction', type: 'string', title: 'Instruction'},
      {
        name: 'input',
        type: 'array',
        title: 'Input',
        of: [defaultBlockOfMember, {type: 'aiTask', title: 'Ai Task'}],
      },
    ])
  })

  test('mutually-recursive block-objects unfold one level then emit cycle stubs', () => {
    // Two block-objects reference each other from `content` arrays. The
    // bridge should inline each through the other once, then stub the
    // recursion. The editor resolver picks up the stubs from `blockObjects`.
    const aType = defineType({
      type: 'object',
      name: 'a',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'b'}),
          ],
        }),
      ],
    })
    const bType = defineType({
      type: 'object',
      name: 'b',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'a'}),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'a'}),
        defineArrayMember({type: 'b'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, aType, bType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const a = schema.blockObjects?.find((bo) => bo.name === 'a')
    const b = schema.blockObjects?.find((bo) => bo.name === 'b')

    // A's `content.of` inlines B (one level), and B (inlined inside A)
    // emits a cycle stub for A.
    expect(a?.fields).toEqual([
      {
        name: 'content',
        type: 'array',
        title: 'Content',
        of: [
          defaultBlockOfMember,
          {
            type: 'object',
            name: 'b',
            title: 'B',
            fields: [
              {
                name: 'content',
                type: 'array',
                title: 'Content',
                of: [defaultBlockOfMember, {type: 'a', title: 'A'}],
              },
            ],
          },
        ],
      },
    ])
    // Symmetrically, B's `content.of` inlines A (one level), and A
    // (inlined inside B) emits a cycle stub for B.
    expect(b?.fields).toEqual([
      {
        name: 'content',
        type: 'array',
        title: 'Content',
        of: [
          defaultBlockOfMember,
          {
            type: 'object',
            name: 'a',
            title: 'A',
            fields: [
              {
                name: 'content',
                type: 'array',
                title: 'Content',
                of: [defaultBlockOfMember, {type: 'b', title: 'B'}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('three-way cycle (A -> B -> C -> A) unfolds two levels then stubs', () => {
    const aType = defineType({
      type: 'object',
      name: 'a',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'b'}),
          ],
        }),
      ],
    })
    const bType = defineType({
      type: 'object',
      name: 'b',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'c'}),
          ],
        }),
      ],
    })
    const cType = defineType({
      type: 'object',
      name: 'c',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'a'}),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'a'}),
        defineArrayMember({type: 'b'}),
        defineArrayMember({type: 'c'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, aType, bType, cType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const a = schema.blockObjects?.find((bo) => bo.name === 'a')

    // A's content inlines B; B's content inlines C; C's content stubs A
    // (cycle: A is in the ancestor chain when walking C's content).
    expect(a?.fields).toEqual([
      {
        name: 'content',
        type: 'array',
        title: 'Content',
        of: [
          defaultBlockOfMember,
          {
            type: 'object',
            name: 'b',
            title: 'B',
            fields: [
              {
                name: 'content',
                type: 'array',
                title: 'Content',
                of: [
                  defaultBlockOfMember,
                  {
                    type: 'object',
                    name: 'c',
                    title: 'C',
                    fields: [
                      {
                        name: 'content',
                        type: 'array',
                        title: 'Content',
                        of: [defaultBlockOfMember, {type: 'a', title: 'A'}],
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

  test('shared type referenced from two block-objects unfolds in each', () => {
    // Diamond shape: both A and B reference C in their content. C is
    // not recursive on its own. The bridge should fully inline C inside
    // both A and B (no cycle, no stub).
    const cType = defineType({
      type: 'object',
      name: 'c',
      fields: [defineField({name: 'label', type: 'string'})],
    })
    const aType = defineType({
      type: 'object',
      name: 'a',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'c'}),
          ],
        }),
      ],
    })
    const bType = defineType({
      type: 'object',
      name: 'b',
      fields: [
        defineField({
          type: 'array',
          name: 'content',
          of: [
            defineArrayMember({type: 'block', name: 'block'}),
            defineArrayMember({type: 'c'}),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'a'}),
        defineArrayMember({type: 'b'}),
        defineArrayMember({type: 'c'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [portableTextType, aType, bType, cType],
    })

    const schema = sanitySchemaToPortableTextSchema(sanitySchema.get('body'))
    const a = schema.blockObjects?.find((bo) => bo.name === 'a')
    const b = schema.blockObjects?.find((bo) => bo.name === 'b')

    const cInline = {
      type: 'object',
      name: 'c',
      title: 'C',
      fields: [{name: 'label', type: 'string', title: 'Label'}],
    }

    expect(a?.fields).toEqual([
      {
        name: 'content',
        type: 'array',
        title: 'Content',
        of: [defaultBlockOfMember, cInline],
      },
    ])
    expect(b?.fields).toEqual([
      {
        name: 'content',
        type: 'array',
        title: 'Content',
        of: [defaultBlockOfMember, cInline],
      },
    ])
  })

  test('a container whose block member restricts marks/styles/lists produces a sub-schema that does not leak the root schema', () => {
    // A code-block container: `lines` is an array of a block that strips
    // every mark, every style except `code`, and every list. This is the
    // Sanity shape Canvas uses (decorators/annotations under `marks`,
    // `styles`/`lists` top-level). The resolved sub-schema for the lines
    // must reflect those restrictions, otherwise markdown-shortcuts and
    // character-pair-decorator (which gate on the sub-schema) fire inside
    // the container and corrupt content.
    const codeBlockType = defineType({
      type: 'object',
      name: 'code-block',
      fields: [
        defineField({
          type: 'array',
          name: 'lines',
          of: [
            defineArrayMember({
              type: 'block',
              name: 'block',
              styles: [{title: 'Code', value: 'code'}],
              lists: [],
              marks: {decorators: [], annotations: []},
              of: [],
            }),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'code-block'}),
      ],
    })

    const schema = sanitySchemaToPortableTextSchema(
      SanitySchema.compile({types: [portableTextType, codeBlockType]}).get(
        'body',
      ),
    )

    const codeBlock = schema.blockObjects?.find(
      (bo) => bo.name === 'code-block',
    )
    const linesField = codeBlock?.fields?.find(
      (field) => field.name === 'lines',
    ) as {of: ReadonlyArray<OfDefinition>} | undefined
    const subSchema = getSubSchema(schema, linesField?.of ?? [])

    expect({
      styles: subSchema.styles.map((style) => style.name),
      decorators: subSchema.decorators.map((decorator) => decorator.name),
      annotations: subSchema.annotations.map((annotation) => annotation.name),
      lists: subSchema.lists.map((list) => list.name),
    }).toEqual({
      // Sanity always injects the `normal` style; the restriction strips
      // everything else (no headings), all decorators, all annotations,
      // and all lists.
      styles: ['normal', 'code'],
      decorators: [],
      annotations: [],
      lists: [],
    })
  })

  test('the restriction is honored at arbitrary nesting depth', () => {
    // table → row → cell → content[block]. The deepest block-member
    // strips every mark and every style except `normal`. The PR's
    // resolveBlockOfMember compares against the root block's enabled
    // names; the intermediate containers must not shadow that
    // comparison, so the restriction must survive at depth.
    const tableType = defineType({
      type: 'object',
      name: 'table',
      fields: [
        defineField({
          type: 'array',
          name: 'rows',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'row',
              fields: [
                defineField({
                  type: 'array',
                  name: 'cells',
                  of: [
                    defineArrayMember({
                      type: 'object',
                      name: 'cell',
                      fields: [
                        defineField({
                          type: 'array',
                          name: 'content',
                          of: [
                            defineArrayMember({
                              type: 'block',
                              name: 'block',
                              styles: [{title: 'Normal', value: 'normal'}],
                              lists: [],
                              marks: {decorators: [], annotations: []},
                              of: [],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'table'}),
      ],
    })

    const schema = sanitySchemaToPortableTextSchema(
      SanitySchema.compile({types: [portableTextType, tableType]}).get('body'),
    )

    // Walk down to the deepest `of` array.
    const table = schema.blockObjects?.find((bo) => bo.name === 'table')
    const rowsField = table?.fields?.find((f) => f.name === 'rows') as
      | {of: ReadonlyArray<OfDefinition>}
      | undefined
    const row = rowsField?.of?.find(
      (
        member,
      ): member is OfDefinition & {
        name: string
        fields: ReadonlyArray<FieldDefinition>
      } => (member as {name?: string}).name === 'row',
    )
    const cellsField = row?.fields?.find((f) => f.name === 'cells') as
      | {of: ReadonlyArray<OfDefinition>}
      | undefined
    const cell = cellsField?.of?.find(
      (
        member,
      ): member is OfDefinition & {
        name: string
        fields: ReadonlyArray<FieldDefinition>
      } => (member as {name?: string}).name === 'cell',
    )
    const contentField = cell?.fields?.find((f) => f.name === 'content') as
      | {of: ReadonlyArray<OfDefinition>}
      | undefined
    const subSchema = getSubSchema(schema, contentField?.of ?? [])

    expect({
      styles: subSchema.styles.map((style) => style.name),
      decorators: subSchema.decorators.map((decorator) => decorator.name),
      annotations: subSchema.annotations.map((annotation) => annotation.name),
      lists: subSchema.lists.map((list) => list.name),
    }).toEqual({
      styles: ['normal'],
      decorators: [],
      annotations: [],
      lists: [],
    })
  })

  test('two restricted block members in the same container resolve independently', () => {
    // A container whose `lines` declares two block types with different
    // restrictions: `code-line` strips everything; `quote-line` allows the
    // `em` decorator and the `blockquote` style. Each member's resolved
    // shape must reflect its OWN restrictions, not be cross-contaminated
    // by the sibling member's resolution.
    const codeBlockType = defineType({
      type: 'object',
      name: 'code-block',
      fields: [
        defineField({
          type: 'array',
          name: 'lines',
          of: [
            defineArrayMember({
              type: 'block',
              name: 'code-line',
              styles: [{title: 'Code', value: 'code'}],
              lists: [],
              marks: {decorators: [], annotations: []},
              of: [],
            }),
            defineArrayMember({
              type: 'block',
              name: 'quote-line',
              styles: [{title: 'Quote', value: 'blockquote'}],
              lists: [],
              marks: {
                decorators: [{title: 'Emphasis', value: 'em'}],
                annotations: [],
              },
              of: [],
            }),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'code-block'}),
      ],
    })

    const schema = sanitySchemaToPortableTextSchema(
      SanitySchema.compile({types: [portableTextType, codeBlockType]}).get(
        'body',
      ),
    )

    const codeBlock = schema.blockObjects?.find(
      (bo) => bo.name === 'code-block',
    )
    const linesField = codeBlock?.fields?.find(
      (field) => field.name === 'lines',
    ) as {of: ReadonlyArray<OfDefinition>} | undefined
    const of = linesField?.of ?? []

    // Each member's resolved shape, asserted independently.
    // Sanity drops the `name` field on bridge output, so members are
    // identified by their position in the `of` array.
    const codeLine = of[0]
    const quoteLine = of[1]

    expect({
      codeLine: {
        styles: (
          codeLine as {styles?: ReadonlyArray<{value: string}>}
        )?.styles?.map((s) => s.value),
        decorators: (
          codeLine as {decorators?: ReadonlyArray<{value: string}>}
        )?.decorators?.map((d) => d.value),
      },
      quoteLine: {
        styles: (
          quoteLine as {styles?: ReadonlyArray<{value: string}>}
        )?.styles?.map((s) => s.value),
        decorators: (
          quoteLine as {decorators?: ReadonlyArray<{value: string}>}
        )?.decorators?.map((d) => d.value),
      },
    }).toEqual({
      // Sanity always injects the `normal` style on every block, so the
      // restricted set is `['normal', <restriction>]` not just the
      // restriction value.
      codeLine: {styles: ['normal', 'code'], decorators: []},
      quoteLine: {styles: ['normal', 'blockquote'], decorators: ['em']},
    })
  })

  test('a container block member that allows no inline objects does not inherit the root inline objects', () => {
    // The root block allows a `stock-ticker` inline object; the code-block
    // line declares `of: []`. The line's sub-schema must advertise no
    // inline objects, otherwise the restriction leaks the root's.
    const stockTicker = defineType({
      type: 'object',
      name: 'stock-ticker',
      fields: [defineField({name: 'symbol', type: 'string'})],
    })
    const codeBlockType = defineType({
      type: 'object',
      name: 'code-block',
      fields: [
        defineField({
          type: 'array',
          name: 'lines',
          of: [
            defineArrayMember({
              type: 'block',
              name: 'block',
              styles: [{title: 'Code', value: 'code'}],
              lists: [],
              marks: {decorators: [], annotations: []},
              of: [],
            }),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          of: [{type: 'stock-ticker'}],
        }),
        defineArrayMember({type: 'code-block'}),
      ],
    })

    const schema = sanitySchemaToPortableTextSchema(
      SanitySchema.compile({
        types: [portableTextType, codeBlockType, stockTicker],
      }).get('body'),
    )

    expect(schema.inlineObjects?.map((object) => object.name)).toEqual([
      'stock-ticker',
    ])

    const codeBlock = schema.blockObjects?.find(
      (bo) => bo.name === 'code-block',
    )
    const linesField = codeBlock?.fields?.find(
      (field) => field.name === 'lines',
    ) as {of: ReadonlyArray<OfDefinition>} | undefined
    const subSchema = getSubSchema(schema, linesField?.of ?? [])

    expect(subSchema.inlineObjects.map((object) => object.name)).toEqual([])
  })

  test('a compiled schema whose annotation field references a named type absent from the registry throws the raw Sanity error with no hint', () => {
    const richText = defineType({
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          marks: {
            annotations: [
              {
                name: 'customLink',
                type: 'object',
                fields: [{name: 'customLink', type: 'customUrl'}],
              },
            ],
          },
        }),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      name: 'test',
      types: [richText, ...builtinTypes],
    })

    expect(() =>
      sanitySchemaToPortableTextSchema(sanitySchema.get('richText')),
    ).toThrow(new Error('Unknown type: customUrl'))
  })

  test('a raw array definition whose annotation field references an undefined named type throws the raw Sanity error with no hint', () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          marks: {
            annotations: [
              {
                name: 'customLink',
                type: 'object',
                fields: [{name: 'customLink', type: 'customUrl'}],
              },
            ],
          },
        }),
      ],
    }

    expect(() => sanitySchemaToPortableTextSchema(richText)).toThrow(
      new Error('Unknown type: customUrl'),
    )
  })

  test('a root array definition named like a Sanity built-in type still resolves its own block member', () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'text',
      of: [defineField({type: 'block', name: 'block'})],
    }

    expect(sanitySchemaToPortableTextSchema(richText)).toEqual(defaultSchema)
  })

  test('a raw array definition whose block object has a field typed like the root type resolves the field to itself', () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({
          type: 'object',
          name: 'callout',
          fields: [defineField({name: 'nested', type: 'richText'})],
        }),
      ],
    }

    const schema = sanitySchemaToPortableTextSchema(richText)

    expect(schema).toEqual({
      ...defaultSchema,
      blockObjects: [
        {
          name: 'callout',
          title: 'Callout',
          fields: [
            {
              name: 'nested',
              type: 'array',
              title: 'Nested',
              of: [defaultBlockOfMember, {type: 'callout', title: 'Callout'}],
            },
          ],
        },
      ],
    })
  })

  test('a root array definition named like a `builtinTypes` extra compiles', () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'slug',
      of: [defineField({type: 'block', name: 'block'})],
    }

    expect(sanitySchemaToPortableTextSchema(richText)).toEqual(defaultSchema)
  })

  test('a block object reached through a same-named root reference stays a bare reference', () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({
          type: 'object',
          name: 'callout',
          fields: [defineField({name: 'title', type: 'string'})],
        }),
        defineArrayMember({
          type: 'object',
          name: 'note',
          fields: [defineField({name: 'body', type: 'richText'})],
        }),
      ],
    }

    const schema = sanitySchemaToPortableTextSchema(richText)

    expect(schema).toEqual({
      ...defaultSchema,
      blockObjects: [
        {
          name: 'callout',
          title: 'Callout',
          fields: [{name: 'title', type: 'string', title: 'Title'}],
        },
        {
          name: 'note',
          title: 'Note',
          fields: [
            {
              name: 'body',
              type: 'array',
              title: 'Body',
              of: [
                defaultBlockOfMember,
                {type: 'callout', title: 'Callout'},
                {type: 'note', title: 'Note'},
              ],
            },
          ],
        },
      ],
    })
  })

  test('a member field named like a Sanity built-in type resolves to the built-in type instead of the same-named root definition', () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'text',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({
          type: 'object',
          name: 'callout',
          fields: [defineField({name: 'label', type: 'text'})],
        }),
      ],
    }

    expect(sanitySchemaToPortableTextSchema(richText)).toEqual({
      ...defaultSchema,
      blockObjects: [
        {
          name: 'callout',
          title: 'Callout',
          fields: [{name: 'label', type: 'string', title: 'Label'}],
        },
      ],
    })
  })

  test('a compiled non-array type whose name collides with a Sanity built-in type throws a diagnostic naming the collision', () => {
    const compiled = SanitySchema.compile({
      name: 'test',
      types: [
        {
          type: 'array',
          name: 'text',
          of: [defineField({type: 'block', name: 'block'})],
        },
      ],
    })

    expect(() =>
      sanitySchemaToPortableTextSchema(compiled.get('text') as any),
    ).toThrow(
      new Error(
        "Expected an array schema type but received 'text' (jsonType: 'string'). 'text' collides with a Sanity built-in type, so `.get('text')` returned the built-in type instead of your custom type.",
      ),
    )
  })

  test('a compiled non-array type whose name collides with a Sanity built-in object type throws a diagnostic naming the collision', () => {
    const compiled = SanitySchema.compile({
      name: 'test',
      types: [
        {
          type: 'array',
          name: 'image',
          of: [defineField({type: 'block', name: 'block'})],
        },
      ],
    })

    expect(() =>
      sanitySchemaToPortableTextSchema(compiled.get('image') as any),
    ).toThrow(
      new Error(
        "Expected an array schema type but received 'image' (jsonType: 'object'). 'image' collides with a Sanity built-in type, so `.get('image')` returned the built-in type instead of your custom type.",
      ),
    )
  })

  test('a compiled non-array type whose name does not collide with a Sanity built-in type throws a diagnostic without the collision sentence', () => {
    const compiled = SanitySchema.compile({
      name: 'test',
      types: [
        defineType({
          type: 'object',
          name: 'foo',
          fields: [defineField({name: 'a', type: 'string'})],
        }),
      ],
    })

    expect(() =>
      sanitySchemaToPortableTextSchema(compiled.get('foo') as any),
    ).toThrow(
      new Error(
        "Expected an array schema type but received 'foo' (jsonType: 'object').",
      ),
    )
  })

  test('a container inline object that shares a name with the root but differs in shape keeps its own shape', () => {
    // Root allows inline `widget` with field `a`; the code-block line
    // allows inline `widget` with field `b`. The name matches but the
    // shape differs, so the line's sub-schema must keep its own `widget`
    // (field `b`), not inherit the root's (field `a`).
    const codeBlockType = defineType({
      type: 'object',
      name: 'code-block',
      fields: [
        defineField({
          type: 'array',
          name: 'lines',
          of: [
            defineArrayMember({
              type: 'block',
              name: 'block',
              styles: [{title: 'Code', value: 'code'}],
              lists: [],
              marks: {decorators: [], annotations: []},
              of: [
                {
                  type: 'object',
                  name: 'widget',
                  fields: [{name: 'b', type: 'string'}],
                },
              ],
            }),
          ],
        }),
      ],
    })
    const portableTextType = defineType({
      type: 'array',
      name: 'body',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          of: [
            {
              type: 'object',
              name: 'widget',
              fields: [{name: 'a', type: 'string'}],
            },
          ],
        }),
        defineArrayMember({type: 'code-block'}),
      ],
    })

    const schema = sanitySchemaToPortableTextSchema(
      SanitySchema.compile({types: [portableTextType, codeBlockType]}).get(
        'body',
      ),
    )

    expect(
      schema.inlineObjects
        ?.find((object) => object.name === 'widget')
        ?.fields.map((field) => field.name),
    ).toEqual(['a'])

    const codeBlock = schema.blockObjects?.find(
      (bo) => bo.name === 'code-block',
    )
    const linesField = codeBlock?.fields?.find(
      (field) => field.name === 'lines',
    ) as {of: ReadonlyArray<OfDefinition>} | undefined
    const subSchema = getSubSchema(schema, linesField?.of ?? [])

    expect(
      subSchema.inlineObjects
        .find((object) => object.name === 'widget')
        ?.fields.map((field) => field.name),
    ).toEqual(['b'])
  })
})

describe(sanitySchemaDefinitionToPortableTextSchema.name, () => {
  test('a raw array definition whose annotation field references a named sibling type resolves it via options.types', () => {
    const customUrl = defineType({
      name: 'customUrl',
      type: 'object',
      fields: [
        defineField({name: 'href', type: 'url'}),
        defineField({name: 'blank', type: 'boolean'}),
      ],
    })

    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          marks: {
            annotations: [
              {
                name: 'customLink',
                type: 'object',
                fields: [{name: 'customLink', type: 'customUrl'}],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'customCallout',
          fields: [{name: 'link', type: 'customUrl'}],
        }),
      ],
    }

    const schema = sanitySchemaDefinitionToPortableTextSchema(richText, {
      types: [customUrl],
    })

    expect(schema).toEqual({
      block: {
        name: 'block',
      },
      span: {
        name: 'span',
      },
      styles: [
        {name: 'normal', title: 'Normal', value: 'normal'},
        {name: 'h1', title: 'Heading 1', value: 'h1'},
        {name: 'h2', title: 'Heading 2', value: 'h2'},
        {name: 'h3', title: 'Heading 3', value: 'h3'},
        {name: 'h4', title: 'Heading 4', value: 'h4'},
        {name: 'h5', title: 'Heading 5', value: 'h5'},
        {name: 'h6', title: 'Heading 6', value: 'h6'},
        {name: 'blockquote', title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {name: 'bullet', title: 'Bulleted list', value: 'bullet'},
        {name: 'number', title: 'Numbered list', value: 'number'},
      ],
      decorators: [
        {name: 'strong', title: 'Strong', value: 'strong'},
        {name: 'em', title: 'Italic', value: 'em'},
        {name: 'code', title: 'Code', value: 'code'},
        {name: 'underline', title: 'Underline', value: 'underline'},
        {name: 'strike-through', title: 'Strike', value: 'strike-through'},
      ],
      annotations: [
        {
          name: 'customLink',
          title: 'Custom Link',
          fields: [
            {
              name: 'customLink',
              type: 'object',
              title: 'Custom Link',
            },
          ],
        },
      ],
      blockObjects: [
        {
          name: 'customCallout',
          title: 'Custom Callout',
          fields: [
            {
              name: 'link',
              type: 'object',
              title: 'Link',
            },
          ],
        },
      ],
      inlineObjects: [],
    })
  })

  test('a raw array definition whose annotation field references an undefined named type throws with a hint to pass options.types', () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          marks: {
            annotations: [
              {
                name: 'customLink',
                type: 'object',
                fields: [{name: 'customLink', type: 'customUrl'}],
              },
            ],
          },
        }),
      ],
    }

    expect(() => sanitySchemaDefinitionToPortableTextSchema(richText)).toThrow(
      new Error(
        "Unknown type: customUrl. Define 'customUrl' in the schema or pass it via `options.types`.",
      ),
    )
  })

  test('a raw array definition whose annotation field references a named type not covered by options.types throws with a hint to pass options.types', () => {
    const someOtherType = defineType({
      name: 'someOtherType',
      type: 'object',
      fields: [defineField({name: 'label', type: 'string'})],
    })

    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          marks: {
            annotations: [
              {
                name: 'customLink',
                type: 'object',
                fields: [{name: 'customLink', type: 'customUrl'}],
              },
            ],
          },
        }),
      ],
    }

    expect(() =>
      sanitySchemaDefinitionToPortableTextSchema(richText, {
        types: [someOtherType],
      }),
    ).toThrow(
      new Error(
        "Unknown type: customUrl. Define 'customUrl' in the schema or pass it via `options.types`.",
      ),
    )
  })

  test('options.types entries named like the root definition are dropped, the passed definition wins', () => {
    const customUrl = defineType({
      name: 'customUrl',
      type: 'object',
      fields: [
        defineField({name: 'href', type: 'url'}),
        defineField({name: 'blank', type: 'boolean'}),
      ],
    })

    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          marks: {
            annotations: [
              {
                name: 'customLink',
                type: 'object',
                fields: [{name: 'customLink', type: 'customUrl'}],
              },
            ],
          },
        }),
      ],
    }

    const expected: Schema = {
      block: {
        name: 'block',
      },
      span: {
        name: 'span',
      },
      styles: [
        {name: 'normal', title: 'Normal', value: 'normal'},
        {name: 'h1', title: 'Heading 1', value: 'h1'},
        {name: 'h2', title: 'Heading 2', value: 'h2'},
        {name: 'h3', title: 'Heading 3', value: 'h3'},
        {name: 'h4', title: 'Heading 4', value: 'h4'},
        {name: 'h5', title: 'Heading 5', value: 'h5'},
        {name: 'h6', title: 'Heading 6', value: 'h6'},
        {name: 'blockquote', title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {name: 'bullet', title: 'Bulleted list', value: 'bullet'},
        {name: 'number', title: 'Numbered list', value: 'number'},
      ],
      decorators: [
        {name: 'strong', title: 'Strong', value: 'strong'},
        {name: 'em', title: 'Italic', value: 'em'},
        {name: 'code', title: 'Code', value: 'code'},
        {name: 'underline', title: 'Underline', value: 'underline'},
        {name: 'strike-through', title: 'Strike', value: 'strike-through'},
      ],
      annotations: [
        {
          name: 'customLink',
          title: 'Custom Link',
          fields: [
            {
              name: 'customLink',
              type: 'object',
              title: 'Custom Link',
            },
          ],
        },
      ],
      blockObjects: [],
      inlineObjects: [],
    }

    expect(
      sanitySchemaDefinitionToPortableTextSchema(richText, {
        types: [customUrl],
      }),
    ).toEqual(expected)

    expect(
      sanitySchemaDefinitionToPortableTextSchema(richText, {
        types: [richText, customUrl],
      }),
    ).toEqual(expected)

    const divergentRichText = defineType({
      name: 'richText',
      type: 'array',
      of: [{type: 'string'}],
    })

    expect(
      sanitySchemaDefinitionToPortableTextSchema(richText, {
        types: [divergentRichText, customUrl],
      }),
    ).toEqual(expected)
  })

  test('an options.types entry named like a Sanity built-in type is ignored, the built-in wins', () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({type: 'image', name: 'image'}),
      ],
    }

    const customImage = defineType({
      name: 'image',
      type: 'object',
      fields: [defineField({name: 'caption', type: 'string'})],
    })

    const schema = sanitySchemaDefinitionToPortableTextSchema(richText, {
      types: [customImage],
    })

    expect(schema.blockObjects).toEqual([
      {
        name: 'image',
        title: 'Image',
        fields: [
          {name: 'asset', title: 'Asset', type: 'object'},
          {name: 'media', title: 'Media', type: 'object'},
          {name: 'hotspot', title: 'Hotspot', type: 'object'},
          {name: 'crop', title: 'Crop', type: 'object'},
        ],
      },
    ])
  })

  test("two options.types entries sharing a name throw Sanity's raw duplicate-type-name error untouched", () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [defineArrayMember({type: 'block', name: 'block'})],
    }

    const dupA = defineType({
      name: 'dup',
      type: 'object',
      fields: [defineField({name: 'a', type: 'string'})],
    })
    const dupB = defineType({
      name: 'dup',
      type: 'object',
      fields: [defineField({name: 'b', type: 'string'})],
    })

    expect(() =>
      sanitySchemaDefinitionToPortableTextSchema(richText, {
        types: [dupA, dupB],
      }),
    ).toThrow(new Error('Duplicate type name added to schema: dup'))
  })

  test('a raw array definition named like a Sanity built-in type resolves a customUrl sibling via options.types', () => {
    const customUrl = defineType({
      name: 'customUrl',
      type: 'object',
      fields: [
        defineField({name: 'href', type: 'url'}),
        defineField({name: 'blank', type: 'boolean'}),
      ],
    })

    const richText: ArrayDefinition = {
      type: 'array',
      name: 'text',
      of: [
        defineArrayMember({
          type: 'block',
          name: 'block',
          marks: {
            annotations: [
              {
                name: 'customLink',
                type: 'object',
                fields: [{name: 'customLink', type: 'customUrl'}],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'object',
          name: 'customCallout',
          fields: [{name: 'link', type: 'customUrl'}],
        }),
      ],
    }

    const schema = sanitySchemaDefinitionToPortableTextSchema(richText, {
      types: [customUrl],
    })

    expect(schema).toEqual({
      block: {
        name: 'block',
      },
      span: {
        name: 'span',
      },
      styles: [
        {name: 'normal', title: 'Normal', value: 'normal'},
        {name: 'h1', title: 'Heading 1', value: 'h1'},
        {name: 'h2', title: 'Heading 2', value: 'h2'},
        {name: 'h3', title: 'Heading 3', value: 'h3'},
        {name: 'h4', title: 'Heading 4', value: 'h4'},
        {name: 'h5', title: 'Heading 5', value: 'h5'},
        {name: 'h6', title: 'Heading 6', value: 'h6'},
        {name: 'blockquote', title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {name: 'bullet', title: 'Bulleted list', value: 'bullet'},
        {name: 'number', title: 'Numbered list', value: 'number'},
      ],
      decorators: [
        {name: 'strong', title: 'Strong', value: 'strong'},
        {name: 'em', title: 'Italic', value: 'em'},
        {name: 'code', title: 'Code', value: 'code'},
        {name: 'underline', title: 'Underline', value: 'underline'},
        {name: 'strike-through', title: 'Strike', value: 'strike-through'},
      ],
      annotations: [
        {
          name: 'customLink',
          title: 'Custom Link',
          fields: [
            {
              name: 'customLink',
              type: 'object',
              title: 'Custom Link',
            },
          ],
        },
      ],
      blockObjects: [
        {
          name: 'customCallout',
          title: 'Custom Callout',
          fields: [
            {
              name: 'link',
              type: 'object',
              title: 'Link',
            },
          ],
        },
      ],
      inlineObjects: [],
    })
  })

  test("a raw array definition whose block object references the root type by name resolves the field as the root's array shape", () => {
    const richText: ArrayDefinition = {
      type: 'array',
      name: 'richText',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        defineArrayMember({
          type: 'object',
          name: 'callout',
          fields: [defineField({name: 'nested', type: 'richText'})],
        }),
      ],
    }

    const schema = sanitySchemaDefinitionToPortableTextSchema(richText)

    expect(schema).toEqual({
      block: {
        name: 'block',
      },
      span: {
        name: 'span',
      },
      styles: [
        {name: 'normal', title: 'Normal', value: 'normal'},
        {name: 'h1', title: 'Heading 1', value: 'h1'},
        {name: 'h2', title: 'Heading 2', value: 'h2'},
        {name: 'h3', title: 'Heading 3', value: 'h3'},
        {name: 'h4', title: 'Heading 4', value: 'h4'},
        {name: 'h5', title: 'Heading 5', value: 'h5'},
        {name: 'h6', title: 'Heading 6', value: 'h6'},
        {name: 'blockquote', title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {name: 'bullet', title: 'Bulleted list', value: 'bullet'},
        {name: 'number', title: 'Numbered list', value: 'number'},
      ],
      decorators: [
        {name: 'strong', title: 'Strong', value: 'strong'},
        {name: 'em', title: 'Italic', value: 'em'},
        {name: 'code', title: 'Code', value: 'code'},
        {name: 'underline', title: 'Underline', value: 'underline'},
        {name: 'strike-through', title: 'Strike', value: 'strike-through'},
      ],
      annotations: [
        {
          name: 'link',
          title: 'Link',
          fields: [{name: 'href', type: 'string', title: 'Link'}],
        },
      ],
      blockObjects: [
        {
          name: 'callout',
          title: 'Callout',
          fields: [
            {
              name: 'nested',
              type: 'array',
              title: 'Nested',
              of: [defaultBlockOfMember, {type: 'callout', title: 'Callout'}],
            },
          ],
        },
      ],
      inlineObjects: [],
    })
  })
})
