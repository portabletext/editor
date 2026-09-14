import {
  defineSchema,
  type PortableTextBlock,
  type SchemaDefinition,
} from '@portabletext/editor'
import type {JSX} from 'react'
import {createKeyGenerator} from '../key-generator'
import {playgroundSchemaDefinition} from '../playground-schema-definition'
import {LegacyTablePlugin} from '../plugins/plugin.legacy-table'
import {TablePlugin} from '../plugins/plugin.table'
import {createMarkdownLoopSeed} from './seed'

export type MarkdownLoopPresetId = 'canonical' | 'minimal' | 'legacy'

export type MarkdownLoopPreset = {
  id: MarkdownLoopPresetId
  label: string
  schemaDefinition: SchemaDefinition
  seed: () => Array<PortableTextBlock>
  /** `null` when the preset's schema declares no table type at all. */
  tablePlugin: (() => JSX.Element) | null
}

const minimalSchemaDefinition = defineSchema({
  styles: [
    {title: 'Normal', name: 'normal'},
    {title: 'Heading 1', name: 'h1'},
    {title: 'Heading 2', name: 'h2'},
    {title: 'Heading 3', name: 'h3'},
  ],
  decorators: [
    {title: 'Strong', name: 'strong'},
    {title: 'Emphasis', name: 'em'},
  ],
  annotations: [
    {
      title: 'Link',
      name: 'link',
      fields: [{name: 'href', title: 'HREF', type: 'string'}],
    },
  ],
  lists: [
    {title: 'Bulleted list', name: 'bullet'},
    {title: 'Numbered list', name: 'number'},
  ],
  blockObjects: [
    {
      title: 'Image',
      name: 'image',
      fields: [
        {name: 'src', title: 'Src', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
    },
  ],
  inlineObjects: [
    {
      title: 'Inline image',
      name: 'image',
      fields: [
        {name: 'src', title: 'Src', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
    },
  ],
})

function createMinimalSeed(): Array<PortableTextBlock> {
  const key = createKeyGenerator('minimal-seed')
  const linkKey = key()

  return [
    {
      _type: 'block',
      _key: key(),
      style: 'h1',
      children: [
        {_type: 'span', _key: key(), text: 'Minimal schema', marks: []},
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: key(),
      style: 'h2',
      children: [
        {
          _type: 'span',
          _key: key(),
          text: 'Styles, marks, and not much else',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: key(),
      style: 'h3',
      children: [
        {
          _type: 'span',
          _key: key(),
          text: 'No tables, callouts, code fences, or rules',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: key(),
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: key(),
          text: 'Bold and emphasis still work',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: key(),
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [{_type: 'span', _key: key(), text: 'So do links', marks: []}],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: key(),
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: key(),
          text: 'The editor still ships ',
          marks: [],
        },
        {_type: 'span', _key: key(), text: 'fast', marks: ['strong']},
        {_type: 'span', _key: key(), text: ' and ', marks: []},
        {_type: 'span', _key: key(), text: 'reliable', marks: ['em']},
        {
          _type: 'span',
          _key: key(),
          text: ' markdown interop. See the ',
          marks: [],
        },
        {_type: 'span', _key: key(), text: 'docs site', marks: [linkKey]},
        {
          _type: 'span',
          _key: key(),
          text: ' for the full contract.',
          marks: [],
        },
      ],
      markDefs: [
        {_type: 'link', _key: linkKey, href: 'https://portabletext.org'},
      ],
    },
    {
      _type: 'block',
      _key: key(),
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: key(),
          text: 'Paste a table or a fence into the markdown and watch the degradation report.',
          marks: [],
        },
      ],
      markDefs: [],
    },
  ]
}

const legacySchemaDefinition = defineSchema({
  styles: [
    {title: 'Normal', name: 'normal'},
    {title: 'Heading 1', name: 'h1'},
    {title: 'Heading 2', name: 'h2'},
    {title: 'Heading 3', name: 'h3'},
    {title: 'Heading 4', name: 'h4'},
    {title: 'Heading 5', name: 'h5'},
    {title: 'Heading 6', name: 'h6'},
    {title: 'Quote', name: 'blockquote'},
  ],
  decorators: [
    {title: 'Bold', name: 'bold'},
    {title: 'Italic', name: 'italic'},
    {title: 'Code', name: 'code'},
  ],
  annotations: [
    {
      title: 'Link',
      name: 'link',
      fields: [{name: 'href', title: 'HREF', type: 'string'}],
    },
  ],
  lists: [
    {title: 'Bulleted list', name: 'bullet'},
    {title: 'Numbered list', name: 'number'},
    {title: 'Task list', name: 'task'},
  ],
  blockObjects: [
    {
      title: 'Image',
      name: 'image',
      fields: [
        {name: 'src', title: 'Src', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
    },
    {
      title: 'Code block',
      name: 'codeBlock',
      fields: [
        {name: 'code', title: 'Code', type: 'string'},
        {name: 'language', title: 'Language', type: 'string'},
      ],
    },
    {title: 'Section divider', name: 'sectionDivider'},
    {
      title: 'Rich table',
      name: 'richTable',
      fields: [
        {name: 'headerRows', title: 'Header rows', type: 'number'},
        {
          name: 'rows',
          title: 'Rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'richTableRow',
              fields: [
                {
                  name: 'cells',
                  title: 'Cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'richTableCell',
                      fields: [
                        {
                          name: 'value',
                          title: 'Content',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              decorators: [
                                {title: 'Bold', name: 'bold'},
                                {title: 'Italic', name: 'italic'},
                              ],
                              styles: [{title: 'Normal', name: 'normal'}],
                              annotations: [
                                {
                                  title: 'Link',
                                  name: 'link',
                                  fields: [
                                    {
                                      name: 'href',
                                      title: 'HREF',
                                      type: 'string',
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
  inlineObjects: [
    {
      title: 'Inline image',
      name: 'image',
      fields: [
        {name: 'src', title: 'Src', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
    },
  ],
})

function createLegacySeed(): Array<PortableTextBlock> {
  const key = createKeyGenerator('legacy-seed')

  const cell = (text: string) => ({
    _type: 'richTableCell',
    _key: key(),
    value: [
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        children: [{_type: 'span', _key: key(), text, marks: []}],
        markDefs: [],
      },
    ],
  })

  return [
    {
      _type: 'block',
      _key: key(),
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: key(),
          text: 'The old CMS marks text ',
          marks: [],
        },
        {_type: 'span', _key: key(), text: 'bold', marks: ['bold']},
        {_type: 'span', _key: key(), text: ' and ', marks: []},
        {_type: 'span', _key: key(), text: 'italic', marks: ['italic']},
        {
          _type: 'span',
          _key: key(),
          text: ' under its own decorator names.',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'codeBlock',
      _key: key(),
      language: 'ts',
      code: 'const legacy = true',
    },
    {
      _type: 'richTable',
      _key: key(),
      headerRows: 1,
      rows: [
        {
          _type: 'richTableRow',
          _key: key(),
          cells: [cell('Name'), cell('Value')],
        },
        {
          _type: 'richTableRow',
          _key: key(),
          cells: [cell('legacy'), cell('true')],
        },
      ],
    },
    {_type: 'sectionDivider', _key: key()},
  ]
}

export const markdownLoopPresets: ReadonlyArray<MarkdownLoopPreset> = [
  {
    id: 'canonical',
    label: 'Canonical',
    schemaDefinition: playgroundSchemaDefinition,
    seed: createMarkdownLoopSeed,
    tablePlugin: TablePlugin,
  },
  {
    id: 'minimal',
    label: 'Minimal',
    schemaDefinition: minimalSchemaDefinition,
    seed: createMinimalSeed,
    tablePlugin: null,
  },
  {
    id: 'legacy',
    label: 'Legacy',
    schemaDefinition: legacySchemaDefinition,
    seed: createLegacySeed,
    tablePlugin: LegacyTablePlugin,
  },
]

export function getMarkdownLoopPreset(
  id: MarkdownLoopPresetId,
): MarkdownLoopPreset {
  return (
    markdownLoopPresets.find((preset) => preset.id === id) ??
    markdownLoopPresets[0]!
  )
}
