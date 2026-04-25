import {compileSchema, defineSchema} from '@portabletext/schema'
import {expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {resolveTestbedContainers} from '../node-traversal/node-traversal-testbed'
import {getActiveDecorators} from './selector.get-active-decorators'

test('getActiveDecorators: respects sub-schema decorators inside a container', () => {
  // The callout sub-schema declares only `strong`. A focus inside a
  // callout span with marks=['strong', 'em'] should report only strong as
  // active because em is not in scope.
  const schema = compileSchema(
    defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block', decorators: [{name: 'strong'}]}],
            },
          ],
        },
      ],
    }),
  )
  const containers = resolveTestbedContainers(schema, [
    {scope: '$..callout', field: 'content'},
  ])

  const snapshot = createTestSnapshot({
    context: {
      schema,
      containers,
      value: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {
                  _type: 'span',
                  _key: 's1',
                  text: 'foo',
                  marks: ['strong', 'em'],
                },
              ],
              markDefs: [],
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
          offset: 1,
        },
      },
    },
  })

  expect(getActiveDecorators(snapshot)).toEqual(['strong'])
})

test('getActiveDecorators: expanded across containers — out-of-scope spans do not vote', () => {
  // Selection spans root block (decorators: strong, em) and callout block
  // (decorators: strong only). Root span has both marks. Callout span has
  // strong only. Expected:
  // - strong: in scope in BOTH blocks, present in BOTH spans → active.
  // - em: only in scope in root block (callout doesn't declare em), root
  //   span has it → active (callout span doesn't vote).
  const schema = compileSchema(
    defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block', decorators: [{name: 'strong'}]}],
            },
          ],
        },
      ],
    }),
  )
  const containers = resolveTestbedContainers(schema, [
    {scope: '$..callout', field: 'content'},
  ])

  const snapshot = createTestSnapshot({
    context: {
      schema,
      containers,
      value: [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {
              _type: 'span',
              _key: 's1',
              text: 'foo',
              marks: ['strong', 'em'],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b2',
              children: [
                {_type: 'span', _key: 's2', text: 'bar', marks: ['strong']},
              ],
              markDefs: [],
            },
          ],
        },
      ],
      selection: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
        focus: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
          ],
          offset: 3,
        },
      },
    },
  })

  expect(getActiveDecorators(snapshot).sort()).toEqual(['em', 'strong'])
})

test('getActiveDecorators: expanded across containers — decorator missing in only-in-scope span is not active', () => {
  // strong is declared in both blocks. Root span has it; callout span does
  // not. Both spans are in scope for strong → strong is NOT active.
  const schema = compileSchema(
    defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block', decorators: [{name: 'strong'}]}],
            },
          ],
        },
      ],
    }),
  )
  const containers = resolveTestbedContainers(schema, [
    {scope: '$..callout', field: 'content'},
  ])

  const snapshot = createTestSnapshot({
    context: {
      schema,
      containers,
      value: [
        {
          _type: 'block',
          _key: 'b1',
          children: [
            {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
          ],
          markDefs: [],
        },
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b2',
              children: [{_type: 'span', _key: 's2', text: 'bar', marks: []}],
              markDefs: [],
            },
          ],
        },
      ],
      selection: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0},
        focus: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b2'},
            'children',
            {_key: 's2'},
          ],
          offset: 3,
        },
      },
    },
  })

  expect(getActiveDecorators(snapshot)).toEqual([])
})
