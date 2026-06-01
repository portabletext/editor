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
  path.resolve(__dirname, 'example-document.md'),
  'utf-8',
)
const exampleDocumentMarkdownOut = fs
  .readFileSync(path.resolve(__dirname, 'example-document.out.md'), 'utf-8')
  // Account for hard break spaces that may be stripped by editors/tools
  .replace('hard break\nthat continues', 'hard break  \nthat continues')
  .replace('with a break\nand more', 'with a break  \nand more')
const exampleDocumentTersePt = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'example-document.terse-pt.json'),
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

describe('example document', () => {
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
    })

    expect(`${markdown}\n`).toBe(exampleDocumentMarkdownOut)
  })
})
