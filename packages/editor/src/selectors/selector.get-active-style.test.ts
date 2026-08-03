import {compileSchema, defineSchema} from '@portabletext/schema'
import {expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {resolveTestbedContainers} from '../traversal/node-traversal-testbed'
import {getActiveStyle} from './selector.get-active-style'

test('getActiveStyle: a block missing `style` reads as the schema default', () => {
  const schema = compileSchema(
    defineSchema({styles: [{name: 'normal'}, {name: 'h1'}]}),
  )
  const snapshot = createTestSnapshot({
    context: {
      schema,
      value: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      selection: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
        focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
      },
    },
  })

  expect(getActiveStyle(snapshot)).toBe('normal')
})

test('getActiveStyle: a selection across a styled block and one missing `style` agrees on the default', () => {
  const schema = compileSchema(
    defineSchema({styles: [{name: 'normal'}, {name: 'h1'}]}),
  )
  const snapshot = createTestSnapshot({
    context: {
      schema,
      value: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      selection: {
        anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 1},
        focus: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 2},
      },
    },
  })

  expect(getActiveStyle(snapshot)).toBe('normal')
})

test('getActiveStyle: a block missing `style` inside a container reads the sub-schema default', () => {
  const schema = compileSchema(
    defineSchema({
      styles: [{name: 'normal'}, {name: 'h1'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [{type: 'block', styles: [{name: 'code'}]}],
            },
          ],
        },
      ],
    }),
  )
  const containers = resolveTestbedContainers(schema, [
    {kind: 'container', type: 'code-block', arrayField: 'lines'},
  ])
  const snapshot = createTestSnapshot({
    context: {
      schema,
      containers,
      value: [
        {
          _type: 'code-block',
          _key: 'c1',
          lines: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
              markDefs: [],
            },
          ],
        },
      ],
      selection: {
        anchor: {
          path: [{_key: 'c1'}, 'lines', {_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 1,
        },
        focus: {
          path: [{_key: 'c1'}, 'lines', {_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 1,
        },
      },
    },
  })

  expect(getActiveStyle(snapshot)).toBe('code')
})
