import {
  defineSchema,
  type BlockObjectDefinition,
  type SchemaDefinition,
} from '@portabletext/editor'

export type MarkdownBenchFeatures = {
  table: boolean
  callout: boolean
  image: boolean
  code: boolean
  taskList: boolean
  link: boolean
  strikeThrough: boolean
}

export const defaultFeatures: MarkdownBenchFeatures = {
  table: true,
  callout: true,
  image: true,
  code: true,
  taskList: true,
  link: true,
  strikeThrough: true,
}

export const featureLabels: Record<keyof MarkdownBenchFeatures, string> = {
  table: 'Table',
  callout: 'Callout',
  image: 'Image',
  code: 'Code block',
  taskList: 'Task list',
  link: 'Link',
  strikeThrough: 'Strike-through',
}

const linkFields = [
  {name: 'href', type: 'string'},
  {name: 'title', type: 'string'},
] as const

/**
 * Builds the schema definition both the editor and `markdownToPortableText`
 * compile against. The base (styles, lists, decorators) mirrors
 * `@portabletext/markdown`'s `default-schema.ts`; the toggles gate the
 * optional block objects and the `strike-through`/`task`/`link` extras.
 *
 * The callout `content` field and the table cell `value` field deviate from
 * `default-schema.ts`: they nest a restricted `nestedTextBlock` sub-schema
 * (normal style only) instead of `default-schema.ts`'s untyped array /
 * bare `{type: 'block'}` reference. The restriction is load-bearing, not
 * cosmetic drift: `content`/`value` back a `defineContainer` in
 * `editor-nodes.tsx`, and a container derives its allowed member types from
 * the field's `of`, so an untyped array would leave the callout with no
 * sub-schema to create or edit text blocks against.
 *
 * `extraBlockObjects` merges in block-object definitions the options pane's
 * `schemaTypes.blockObjects` contributes, so a snippet whose output uses a
 * type the toggles don't declare (e.g. `list`, `blockquote`) still compiles
 * for both the editor and the converter.
 */
export function buildSchemaDefinition(
  features: MarkdownBenchFeatures,
  extraBlockObjects: ReadonlyArray<BlockObjectDefinition> = [],
): SchemaDefinition {
  const decorators = [
    {name: 'strong'},
    {name: 'em'},
    {name: 'code'},
    ...(features.strikeThrough ? [{name: 'strike-through'}] : []),
  ] as const
  const annotations = features.link
    ? ([{name: 'link', fields: linkFields}] as const)
    : ([] as const)
  const nestedTextBlock = {
    type: 'block',
    styles: [{name: 'normal'}],
    decorators,
    annotations,
  } as const

  return defineSchema({
    block: {
      fields: [{name: 'checked', type: 'boolean'}],
    },
    styles: [
      {name: 'normal'},
      {name: 'h1'},
      {name: 'h2'},
      {name: 'h3'},
      {name: 'h4'},
      {name: 'h5'},
      {name: 'h6'},
      {name: 'blockquote'},
    ],
    lists: [
      {name: 'number'},
      {name: 'bullet'},
      ...(features.taskList ? [{name: 'task'}] : []),
    ],
    decorators,
    annotations,
    blockObjects: [
      {name: 'horizontal-rule'},
      {name: 'html', fields: [{name: 'html', type: 'string'}]},
      ...(features.callout
        ? [
            {
              name: 'callout',
              fields: [
                {name: 'tone', type: 'string'},
                {name: 'content', type: 'array', of: [nestedTextBlock]},
              ],
            } as const,
          ]
        : []),
      ...(features.code
        ? [
            {
              name: 'code',
              fields: [
                {name: 'language', type: 'string'},
                {name: 'code', type: 'string'},
              ],
            } as const,
          ]
        : []),
      ...(features.image
        ? [
            {
              name: 'image',
              fields: [
                {name: 'src', type: 'string'},
                {name: 'alt', type: 'string'},
                {name: 'title', type: 'string'},
              ],
            } as const,
          ]
        : []),
      ...(features.table
        ? [
            {
              name: 'table',
              fields: [
                {name: 'headerRows', type: 'number'},
                {name: 'alignment', type: 'array'},
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
                                  name: 'value',
                                  type: 'array',
                                  of: features.image
                                    ? [nestedTextBlock, {type: 'image'}]
                                    : [nestedTextBlock],
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
            } as const,
          ]
        : []),
      ...extraBlockObjects,
    ],
    inlineObjects: features.image
      ? [
          {
            name: 'image',
            fields: [
              {name: 'src', type: 'string'},
              {name: 'alt', type: 'string'},
              {name: 'title', type: 'string'},
            ],
          },
        ]
      : [],
  })
}
