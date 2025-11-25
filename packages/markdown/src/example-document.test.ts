import fs from 'node:fs'
import path from 'node:path'
import type {BlockObjectDefinition} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {expect, test} from 'vitest'
import {defaultSchema} from './default-schema'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'
import {buildObjectMatcher} from './to-portable-text/matchers'

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

const tableObjectDefinition = {
  name: 'table',
  fields: [
    {name: 'headerRows', type: 'number'},
    {name: 'rows', type: 'array'},
  ],
} as const satisfies BlockObjectDefinition

const tableObjectMatcher = buildObjectMatcher(tableObjectDefinition)

test('example document', () => {
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
