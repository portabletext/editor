import {
  compileSchema,
  defineSchema,
  getSubSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import type {Path} from '../src/engine/interfaces/path'
import {defineContainer} from '../src/renderers/renderer.types'

/**
 * A schema with two containers: a `callout` that can nest in itself, and a
 * `note` whose `body` declares its own text block sub-schema.
 */
export const textBlockDepthsSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'note',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal'}, {name: 'h1'}],
              decorators: [{name: 'em'}],
            },
          ],
        },
      ],
    },
  ],
})

export const textBlockDepthsContainers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'note', arrayField: 'body'}),
]

/**
 * Where a list of text blocks sits in the value: the full keyed and indexed
 * paths to the array holding them, the type name a text block has there,
 * and the value with the blocks put in place.
 */
type TextBlockDepth = {
  wrapValue: (blocks: Array<PortableTextBlock>) => Array<PortableTextBlock>
  keyedPrefix: Path
  indexedPrefix: Path
  blockName: string
}

/**
 * The four depths a text block can sit at, for `describe.each`.
 */
export const textBlockDepths: Array<{
  depth: string
  wrap: (keyGenerator: () => string) => TextBlockDepth
}> = [
  {depth: 'at the root', wrap: atRoot},
  {depth: 'inside a callout', wrap: inCallout},
  {depth: 'inside a callout inside a callout', wrap: inNestedCallout},
  {depth: 'inside a field with its own sub-schema', wrap: inNote},
]

/**
 * Paths to a span that leave out the child field name between the block
 * segment and the span segment. A compact path addresses nothing.
 */
export const compactSpanPaths: Array<{
  form: string
  path: (depth: TextBlockDepth, blockKey: string, spanKey: string) => Path
}> = [
  {
    form: 'keyed',
    path: (depth, blockKey, spanKey) => [
      ...depth.keyedPrefix,
      {_key: blockKey},
      {_key: spanKey},
    ],
  },
  {
    form: 'indexed',
    path: (depth) => [...depth.indexedPrefix, 0, 0],
  },
  {
    form: 'keyed then indexed',
    path: (depth, blockKey) => [...depth.keyedPrefix, {_key: blockKey}, 0],
  },
  {
    form: 'missing key then indexed',
    path: (depth, blockKey) => [
      ...depth.keyedPrefix,
      {_key: `${blockKey}-missing`},
      0,
    ],
  },
  {
    form: 'missing block prefix',
    path: (depth, blockKey) => [
      ...depth.keyedPrefix,
      {_key: `${blockKey}-missing`},
      'children',
      {_key: blockKey},
      0,
    ],
  },
  {
    form: 'missing container after a missing text block',
    path: (depth, blockKey) => [
      ...depth.keyedPrefix,
      {_key: `${blockKey}-missing`},
      'children',
      {_key: `${blockKey}-missing-container`},
      'content',
      {_key: blockKey},
      0,
    ],
  },
  {
    form: 'missing container prefix',
    path: (depth, blockKey) =>
      depth.keyedPrefix.length === 0
        ? [{_key: `${blockKey}-missing`}, 'children', {_key: blockKey}, 0]
        : [
            {_key: `${blockKey}-missing`},
            ...depth.keyedPrefix.slice(1),
            {_key: blockKey},
            0,
          ],
  },
]

/**
 * A text block with one unmarked span.
 */
export function textBlock(
  blockName: string,
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: blockName,
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

const schema = compileSchema(textBlockDepthsSchemaDefinition)

function atRoot(): TextBlockDepth {
  return {
    wrapValue: (blocks) => blocks,
    keyedPrefix: [],
    indexedPrefix: [],
    blockName: schema.block.name,
  }
}

function inCallout(keyGenerator: () => string): TextBlockDepth {
  const calloutKey = keyGenerator()

  return {
    wrapValue: (blocks) => [
      {_type: 'callout', _key: calloutKey, content: blocks},
    ],
    keyedPrefix: [{_key: calloutKey}, 'content'],
    indexedPrefix: [0, 'content'],
    blockName: schema.block.name,
  }
}

function inNestedCallout(keyGenerator: () => string): TextBlockDepth {
  const outerKey = keyGenerator()
  const innerKey = keyGenerator()

  return {
    wrapValue: (blocks) => [
      {
        _type: 'callout',
        _key: outerKey,
        content: [{_type: 'callout', _key: innerKey, content: blocks}],
      },
    ],
    keyedPrefix: [{_key: outerKey}, 'content', {_key: innerKey}, 'content'],
    indexedPrefix: [0, 'content', 0, 'content'],
    blockName: schema.block.name,
  }
}

function inNote(keyGenerator: () => string): TextBlockDepth {
  const noteKey = keyGenerator()
  const bodyField = schema.blockObjects
    .find((blockObject) => blockObject.name === 'note')
    ?.fields.find((field) => field.name === 'body')
  const bodySchema =
    bodyField?.type === 'array' && bodyField.of
      ? getSubSchema(schema, bodyField.of)
      : schema

  return {
    wrapValue: (blocks) => [{_type: 'note', _key: noteKey, body: blocks}],
    keyedPrefix: [{_key: noteKey}, 'body'],
    indexedPrefix: [0, 'body'],
    blockName: bodySchema.block.name,
  }
}
