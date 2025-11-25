import fs from 'node:fs'
import path from 'node:path'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {expect, test} from 'vitest'
import {defaultSchema} from './default-schema'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'

const exampleDocumentMarkdown = fs.readFileSync(
  path.resolve(__dirname, 'example-document.md'),
  'utf-8',
)
const exampleDocumentTersePt = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, 'example-document.terse-pt.json'),
    'utf-8',
  ),
)

test('example document', () => {
  const keyGenerator = createTestKeyGenerator()
  const blocks = markdownToPortableText(exampleDocumentMarkdown, {keyGenerator})
  const tersePt = getTersePt({schema: defaultSchema, value: blocks})

  expect(tersePt).toEqual(exampleDocumentTersePt)
})
