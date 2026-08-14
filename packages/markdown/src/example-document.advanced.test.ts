import fs from 'node:fs'
import path from 'node:path'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {defaultSchema} from './default-schema'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'

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

describe('example document (advanced)', () => {
  test('markdown to portable text', () => {
    const keyGenerator = createTestKeyGenerator()
    const blocks = markdownToPortableText(exampleDocumentMarkdown, {
      keyGenerator,
    })
    const tersePt = getTersePt({schema: defaultSchema, value: blocks})

    expect(tersePt).toEqual(exampleDocumentTersePt)
  })

  test('portable text to markdown', () => {
    const keyGenerator = createTestKeyGenerator()
    const blocks = markdownToPortableText(exampleDocumentMarkdown, {
      keyGenerator,
      html: {
        inline: 'text',
      },
    })
    const markdown = portableTextToMarkdown(blocks, {
      hardBreak: () => '<br />\n',
    })

    expect(`${markdown}\n`).toBe(exampleDocumentMarkdownOut)
  })
})
