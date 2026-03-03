import {
  compileSchema,
  defineSchema,
  type SchemaDefinition,
} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {assert, expect} from 'vitest'
import {htmlToBlocks, type ImageMatcher} from '../../src'
import {createTestKeyGenerator} from '../test-key-generator'

const imageMatcher: ImageMatcher<{
  src?: string
  alt?: string
  [key: string]: string | undefined
}> = ({context, value, isInline}) => {
  const schemaCollection = isInline
    ? context.schema.inlineObjects
    : context.schema.blockObjects

  if (!schemaCollection.some((item) => item.name === 'image')) {
    return undefined
  }

  return {
    _type: 'image',
    ...(value.src ? {src: value.src} : {}),
    ...(value.alt ? {alt: value.alt} : {}),
  }
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
    return htmlToBlocks(
      html,
      schemaDefinition ? compileSchema(schemaDefinition) : defaultSchema,
      {
        parseHtml: (html) => new JSDOM(html).window.document,
        keyGenerator: createTestKeyGenerator('k'),
        unstable_whitespaceOnPasteMode: 'normalize',
        matchers: {
          image: imageMatcher,
        },
      },
    )
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

  return blocksArray[0]
}
