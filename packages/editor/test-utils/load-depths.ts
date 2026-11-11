import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import type {Path} from '../src/engine/interfaces/path'
import {defineContainer} from '../src/renderers/renderer.types'

export const loadSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'note',
      fields: [
        {name: 'body', type: 'array', of: [{type: 'block'}, {type: 'callout'}]},
      ],
    },
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
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
})

export const loadContainers = [
  defineContainer({type: 'note', arrayField: 'body'}),
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

export type LoadDepth = {
  name: 'root' | 'callout' | 'nested callout' | 'table cell' | 'object field'
  /**
   * Wraps `blocks` as the leaf array of a value at this depth. `prefix` is
   * the path of that array.
   */
  wrap: (
    blocks: Array<PortableTextBlock>,
    wrapperKey: (name: string) => string,
  ) => {value: Array<PortableTextBlock>; prefix: Path}
}

export const loadDepths: Array<LoadDepth> = [
  {name: 'root', wrap: (blocks) => ({value: blocks, prefix: []})},
  {
    name: 'callout',
    wrap: (blocks, wrapperKey) => ({
      value: [{_type: 'callout', _key: wrapperKey('callout'), content: blocks}],
      prefix: [{_key: wrapperKey('callout')}, 'content'],
    }),
  },
  {
    name: 'nested callout',
    wrap: (blocks, wrapperKey) => ({
      value: [
        {
          _type: 'callout',
          _key: wrapperKey('outer'),
          content: [
            {_type: 'callout', _key: wrapperKey('inner'), content: blocks},
          ],
        },
      ],
      prefix: [
        {_key: wrapperKey('outer')},
        'content',
        {_key: wrapperKey('inner')},
        'content',
      ],
    }),
  },
  {
    name: 'table cell',
    wrap: (blocks, wrapperKey) => ({
      value: [
        {
          _type: 'table',
          _key: wrapperKey('table'),
          rows: [
            {
              _type: 'row',
              _key: wrapperKey('row'),
              cells: [
                {_type: 'cell', _key: wrapperKey('cell'), content: blocks},
              ],
            },
          ],
        },
      ],
      prefix: [
        {_key: wrapperKey('table')},
        'rows',
        {_key: wrapperKey('row')},
        'cells',
        {_key: wrapperKey('cell')},
        'content',
      ],
    }),
  },
]

export const loadPositions = ['first', 'middle', 'last'] as const
export type LoadPosition = (typeof loadPositions)[number]

export function positionIndex(position: LoadPosition): number {
  return position === 'first' ? 0 : position === 'middle' ? 1 : 2
}

export function textBlock(
  blockKey: string,
  spanKey: string,
  text: string,
  marks: Array<string> = [],
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks}],
  }
}

/**
 * Hands out one generated key per wrapper name, so a test can wrap several
 * values with the same wrapper keys.
 */
export function createWrapperKeys(keyGenerator: () => string) {
  const keys = new Map<string, string>()
  return (name: string) => {
    const existing = keys.get(name)
    if (existing !== undefined) {
      return existing
    }
    const key = keyGenerator()
    keys.set(name, key)
    return key
  }
}

export const objectFieldDepth: LoadDepth = {
  name: 'object field',
  wrap: (blocks, wrapperKey) => ({
    value: [{_type: 'note', _key: wrapperKey('note'), body: blocks}],
    prefix: [{_key: wrapperKey('note')}, 'body'],
  }),
}
