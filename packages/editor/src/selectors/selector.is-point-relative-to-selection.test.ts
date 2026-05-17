import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {defineContainer} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers'
import {isPointAfterSelection} from './selector.is-point-after-selection'
import {isPointBeforeSelection} from './selector.is-point-before-selection'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

const schema = compileSchema(schemaDefinition)

const calloutContainers = resolveContainers(schema, [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
  }),
])

describe(isPointBeforeSelection.name, () => {
  test('Scenario: a point in an earlier text block in a callout is before a selection in a later text block in the same callout', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const firstBlockKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const secondBlockKey = keyGenerator()
    const secondSpanKey = keyGenerator()

    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: calloutContainers,
        value: [
          {
            _key: calloutKey,
            _type: 'callout',
            content: [
              {
                _key: firstBlockKey,
                _type: 'block',
                children: [
                  {
                    _key: firstSpanKey,
                    _type: 'span',
                    text: 'first',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _key: secondBlockKey,
                _type: 'block',
                children: [
                  {
                    _key: secondSpanKey,
                    _type: 'span',
                    text: 'second',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        selection: {
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: secondBlockKey},
              'children',
              {_key: secondSpanKey},
            ],
            offset: 2,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: secondBlockKey},
              'children',
              {_key: secondSpanKey},
            ],
            offset: 2,
          },
          backward: false,
        },
      },
    })

    const point = {
      path: [
        {_key: calloutKey},
        'content',
        {_key: firstBlockKey},
        'children',
        {_key: firstSpanKey},
      ],
      offset: 0,
    }

    expect(isPointBeforeSelection(point)(snapshot)).toBe(true)
  })

  test('Scenario: a point in a later text block in a callout is not before a selection in an earlier text block in the same callout', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const firstBlockKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const secondBlockKey = keyGenerator()
    const secondSpanKey = keyGenerator()

    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: calloutContainers,
        value: [
          {
            _key: calloutKey,
            _type: 'callout',
            content: [
              {
                _key: firstBlockKey,
                _type: 'block',
                children: [
                  {
                    _key: firstSpanKey,
                    _type: 'span',
                    text: 'first',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _key: secondBlockKey,
                _type: 'block',
                children: [
                  {
                    _key: secondSpanKey,
                    _type: 'span',
                    text: 'second',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        selection: {
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: firstBlockKey},
              'children',
              {_key: firstSpanKey},
            ],
            offset: 2,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: firstBlockKey},
              'children',
              {_key: firstSpanKey},
            ],
            offset: 2,
          },
          backward: false,
        },
      },
    })

    const point = {
      path: [
        {_key: calloutKey},
        'content',
        {_key: secondBlockKey},
        'children',
        {_key: secondSpanKey},
      ],
      offset: 0,
    }

    expect(isPointBeforeSelection(point)(snapshot)).toBe(false)
  })
})

describe(isPointAfterSelection.name, () => {
  test('Scenario: a point in a later text block in a callout is after a selection in an earlier text block in the same callout', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const firstBlockKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const secondBlockKey = keyGenerator()
    const secondSpanKey = keyGenerator()

    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: calloutContainers,
        value: [
          {
            _key: calloutKey,
            _type: 'callout',
            content: [
              {
                _key: firstBlockKey,
                _type: 'block',
                children: [
                  {
                    _key: firstSpanKey,
                    _type: 'span',
                    text: 'first',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _key: secondBlockKey,
                _type: 'block',
                children: [
                  {
                    _key: secondSpanKey,
                    _type: 'span',
                    text: 'second',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        selection: {
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: firstBlockKey},
              'children',
              {_key: firstSpanKey},
            ],
            offset: 2,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: firstBlockKey},
              'children',
              {_key: firstSpanKey},
            ],
            offset: 2,
          },
          backward: false,
        },
      },
    })

    const point = {
      path: [
        {_key: calloutKey},
        'content',
        {_key: secondBlockKey},
        'children',
        {_key: secondSpanKey},
      ],
      offset: 0,
    }

    expect(isPointAfterSelection(point)(snapshot)).toBe(true)
  })

  test('Scenario: a point in an earlier text block in a callout is not after a selection in a later text block in the same callout', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const firstBlockKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const secondBlockKey = keyGenerator()
    const secondSpanKey = keyGenerator()

    const snapshot = createTestSnapshot({
      context: {
        schema,
        containers: calloutContainers,
        value: [
          {
            _key: calloutKey,
            _type: 'callout',
            content: [
              {
                _key: firstBlockKey,
                _type: 'block',
                children: [
                  {
                    _key: firstSpanKey,
                    _type: 'span',
                    text: 'first',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _key: secondBlockKey,
                _type: 'block',
                children: [
                  {
                    _key: secondSpanKey,
                    _type: 'span',
                    text: 'second',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        selection: {
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: secondBlockKey},
              'children',
              {_key: secondSpanKey},
            ],
            offset: 2,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: secondBlockKey},
              'children',
              {_key: secondSpanKey},
            ],
            offset: 2,
          },
          backward: false,
        },
      },
    })

    const point = {
      path: [
        {_key: calloutKey},
        'content',
        {_key: firstBlockKey},
        'children',
        {_key: firstSpanKey},
      ],
      offset: 0,
    }

    expect(isPointAfterSelection(point)(snapshot)).toBe(false)
  })
})
