import {compileSchema, defineSchema} from '@portabletext/schema'
import {expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {resolveTestbedContainers} from '../node-traversal/node-traversal-testbed'
import {getActiveAnnotations} from './selector.get-active-annotations'

test('getActiveAnnotations: respects sub-schema annotations inside a container', () => {
  // Callout sub-schema declares only `link`. Marks list is the same shape
  // as root, but the decorator/annotation classification uses the
  // sub-schema decorators (so a mark not declared as decorator in the
  // sub-schema is treated as an annotation, matching against the block's
  // markDefs).
  const schema = compileSchema(
    defineSchema({
      decorators: [{name: 'strong'}],
      annotations: [{name: 'link'}],
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  decorators: [{name: 'strong'}],
                  annotations: [{name: 'link'}],
                },
              ],
            },
          ],
        },
      ],
    }),
  )
  const containers = resolveTestbedContainers(schema, [
    {scope: '$..callout', field: 'content'},
  ])
  const linkMarkDef = {_type: 'link', _key: 'lk1', href: 'https://x'}

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
                {_type: 'span', _key: 's1', text: 'foo', marks: ['lk1']},
              ],
              markDefs: [linkMarkDef],
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

  expect(getActiveAnnotations(snapshot)).toEqual([linkMarkDef])
})

test('getActiveAnnotations: expanded across containers — out-of-scope spans do not vote', () => {
  // Selection spans root (link mark + matching markDef) and callout
  // (no link mark, no markDef). Callout span doesn't vote because its
  // block has no markDef with the candidate key. Root span votes and
  // has it → annotation is active.
  const schema = compileSchema(
    defineSchema({
      decorators: [{name: 'strong'}],
      annotations: [{name: 'link'}],
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  decorators: [{name: 'strong'}],
                  annotations: [{name: 'link'}],
                },
              ],
            },
          ],
        },
      ],
    }),
  )
  const containers = resolveTestbedContainers(schema, [
    {scope: '$..callout', field: 'content'},
  ])
  const linkMarkDef = {_type: 'link', _key: 'lk1', href: 'https://x'}

  const snapshot = createTestSnapshot({
    context: {
      schema,
      containers,
      value: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: ['lk1']}],
          markDefs: [linkMarkDef],
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

  expect(getActiveAnnotations(snapshot)).toEqual([linkMarkDef])
})
