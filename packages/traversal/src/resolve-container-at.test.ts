import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../test-utils/text-block-depths'
import {compileContainers} from './compile-containers'
import {resolveTestbedContainers} from './node-traversal-testbed'
import {resolveContainerAt} from './resolve-container-at'

describe(`${resolveContainerAt.name} with a compact path to a text block`, () => {
  const schema = compileSchema(textBlockDepthsSchemaDefinition)
  const containers = resolveTestbedContainers(schema, textBlockDepthsContainers)

  test('inside a callout, a compact container path (the innermost container with an index after it) resolves nothing', () => {
    const value = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]

    expect(resolveContainerAt(containers, value, [{_key: 'c0'}, 0])).toEqual(
      undefined,
    )
  })

  test('inside a callout inside a callout, a compact container path (keyed) resolves nothing', () => {
    const value = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ]

    expect(
      resolveContainerAt(containers, value, [{_key: 'c0'}, {_key: 'c1'}]),
    ).toEqual(undefined)
  })

  test('inside a field with its own sub-schema, a compact container path (the innermost container with an index after it) resolves nothing', () => {
    const value = [
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]

    expect(resolveContainerAt(containers, value, [{_key: 'n0'}, 0])).toEqual(
      undefined,
    )
  })
})

describe(`${resolveContainerAt.name} with a positional block object`, () => {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'image',
          fields: [{name: 'caption', type: 'array', of: [{type: 'block'}]}],
        },
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'image',
                  fields: [
                    {name: 'caption', type: 'array', of: [{type: 'block'}]},
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  )

  test('descendants of a block object resolve nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const imageKey = keyGenerator()
    const blockKey = keyGenerator()
    const containers = compileContainers(schema, [
      {
        kind: 'container',
        type: 'callout',
        arrayField: 'content',
        of: [{kind: 'blockObject', type: 'image'}],
      },
    ])
    const value = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'image',
            _key: imageKey,
            caption: [{_type: 'block', _key: blockKey, children: []}],
          },
        ],
      },
    ]

    expect(
      resolveContainerAt(containers, value, [
        {_key: calloutKey},
        'content',
        {_key: imageKey},
        'caption',
        {_key: blockKey},
      ]),
    ).toEqual(undefined)
  })

  test('overrides a top-level container of the same type', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const calloutKey = keyGenerator()
    const calloutImageKey = keyGenerator()
    const containers = compileContainers(schema, [
      {kind: 'container', type: 'image', arrayField: 'caption'},
      {
        kind: 'container',
        type: 'callout',
        arrayField: 'content',
        of: [{kind: 'blockObject', type: 'image'}],
      },
    ])
    const value = [
      {_type: 'image', _key: imageKey, caption: []},
      {
        _type: 'callout',
        _key: calloutKey,
        content: [{_type: 'image', _key: calloutImageKey, caption: []}],
      },
    ]

    expect(
      resolveContainerAt(containers, value, [
        {_key: calloutKey},
        'content',
        {_key: calloutImageKey},
      ]),
    ).toEqual({kind: 'blockObject', type: 'image'})
    expect(resolveContainerAt(containers, value, [{_key: imageKey}])).toEqual(
      containers.get('image'),
    )
  })
})
