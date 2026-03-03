import {
  compileSchema,
  defineSchema,
  type SchemaDefinition,
} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {assert, expect} from 'vitest'
import type {ObjectMatcher} from '../../index'
import {htmlToPortableText} from '../../index'
import {createTestKeyGenerator} from '../test-key-generator'

const imageMatcher: ObjectMatcher<{src?: string; alt?: string}> = ({
  context,
  value,
  isInline,
}) => {
  const schemaCollection = isInline
    ? context.schema.inlineObjects
    : context.schema.blockObjects

  if (!schemaCollection.some((obj) => obj.name === 'image')) {
    return undefined
  }

  // Note: _key is assigned by the engine during normalizeBlock.
  // We return a minimal object here — the conversion layer strips _key
  // before passing to the internal SchemaMatchers engine.
  return {
    _key: '',
    _type: 'image',
    ...(value.src ? {src: value.src} : {}),
  } as ReturnType<ObjectMatcher<{src?: string; alt?: string}>>
}

export function transform(
  html: Array<string>,
  schemaDefinition?: SchemaDefinition,
) {
  const defaultSchema = compileSchema(
    defineSchema({
      annotations: [{name: 'link'}],
      decorators: [
        {name: 'strong'},
        {name: 'em'},
        {name: 'code'},
        {name: 'underline'},
        {name: 'strike-through'},
        {name: 'sup'},
        {name: 'sub'},
        {name: 'ins'},
        {name: 'mark'},
        {name: 'small'},
      ],
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
      blockObjects: [
        {
          name: 'image',
          fields: [{name: 'src', type: 'string'}],
        },
      ],
      inlineObjects: [
        {
          name: 'image',
          fields: [{name: 'src', type: 'string'}],
        },
      ],
    }),
  )

  const blocksArray = html.map((html) => {
    return htmlToPortableText(html, {
      schema: schemaDefinition
        ? compileSchema(schemaDefinition)
        : defaultSchema,
      parseHtml: (html) => new JSDOM(html).window.document,
      keyGenerator: createTestKeyGenerator('k'),
      whitespaceMode: 'normalize',
      types: {
        image: imageMatcher,
      },
    })
  })

  if (blocksArray.length === 0) {
    assert.fail('No blocks were returned')
  }

  for (let i = 1; i < blocksArray.length; i++) {
    expect(
      blocksArray[i],
      `returned blocks for each html blob should be equal`,
    ).toEqual(blocksArray[0])
  }

  const result = blocksArray[0]

  if (!result) {
    throw new Error('No blocks were returned')
  }

  return result
}
