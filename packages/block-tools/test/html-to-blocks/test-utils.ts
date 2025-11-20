import {
  compileSchema,
  defineSchema,
  type SchemaDefinition,
} from '@portabletext/schema'
import {JSDOM} from 'jsdom'
import {assert, expect} from 'vitest'
import {htmlToBlocks, type ImageSchemaMatcher} from '../../src'
import {createTestKeyGenerator} from '../test-key-generator'

const imageMatcher: ImageSchemaMatcher = ({context, props}) => {
  if (
    !context.schema.blockObjects.some(
      (blockObject) => blockObject.name === 'image',
    )
  ) {
    return undefined
  }

  return {
    _type: 'image',
    ...(props.src ? {src: props.src} : {}),
    ...(props.alt ? {alt: props.alt} : {}),
  }
}

const inlineImageMatcher: ImageSchemaMatcher = ({context, props}) => {
  if (
    !context.schema.inlineObjects.some(
      (inlineObject) => inlineObject.name === 'image',
    )
  ) {
    return undefined
  }

  return {
    _type: 'image',
    ...(props.src ? {src: props.src} : {}),
    ...(props.alt ? {alt: props.alt} : {}),
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
          inlineImage: inlineImageMatcher,
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
