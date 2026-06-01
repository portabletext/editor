import fs from 'node:fs'
import path from 'node:path'
import type {BlockObjectDefinition} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {defaultSchema} from './default-schema'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {
  DefaultCodeBlockRenderer,
  DefaultTableRenderer,
} from './from-portable-text/renderers/type'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'
import {buildObjectMatcher} from './to-portable-text/matchers'

const exampleDocumentMarkdown = fs.readFileSync(
  path.resolve(__dirname, 'example-document.advanced.md'),
  'utf-8',
)
const exampleDocumentMarkdownOut = fs.readFileSync(
  path.resolve(__dirname, 'example-document.advanced.out.md'),
  'utf-8',
)
const exampleDocumentTersePt = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'example-document.advanced.terse-pt.json'),
    'utf-8',
  ),
)

const tableObjectDefinition = {
  name: 'table',
  fields: [
    {name: 'headerRows', type: 'number'},
    {name: 'rows', type: 'array'},
  ],
} as const satisfies BlockObjectDefinition

const tableObjectMatcher = buildObjectMatcher(tableObjectDefinition)

describe('example document (advanced)', () => {
  test('markdown to portable text', () => {
    const keyGenerator = createTestKeyGenerator()
    const blocks = markdownToPortableText(exampleDocumentMarkdown, {
      keyGenerator,
      schema: {
        ...defaultSchema,
        blockObjects: [...defaultSchema.blockObjects, tableObjectDefinition],
      },
      types: {
        table: tableObjectMatcher,
      },
    })
    const tersePt = getTersePt({schema: defaultSchema, value: blocks})

    expect(tersePt).toEqual(exampleDocumentTersePt)
  })

  test('portable text to markdown', () => {
    const keyGenerator = createTestKeyGenerator()
    const blocks = markdownToPortableText(exampleDocumentMarkdown, {
      keyGenerator,
      schema: {
        ...defaultSchema,
        blockObjects: [...defaultSchema.blockObjects, tableObjectDefinition],
      },
      types: {
        table: tableObjectMatcher,
      },
      html: {
        inline: 'text',
      },
    })
    const markdown = portableTextToMarkdown(blocks, {
      types: {
        'horizontal-rule': () => '---',
        'table': DefaultTableRenderer,
        'code': DefaultCodeBlockRenderer,
        'html': ({value}) => value.html || '',
        'image': ({value}) =>
          `![${value.alt}](${value.src}${value.title ? ` "${value.title}"` : ''})`,
      },
      hardBreak: () => '<br />\n',
    })

    expect(`${markdown}\n`).toBe(exampleDocumentMarkdownOut)
  })
})
