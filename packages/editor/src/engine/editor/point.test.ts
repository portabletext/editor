import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test} from 'vitest'
import {createBareEditor} from '../../../test-utils/create-bare-editor.test-util'
import {defineContainer} from '../../renderers/renderer.types'
import {resolveContainers} from '../../schema/resolve-containers'
import {point} from './point'

test('point returns zero for a span without text at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ] as never,
    keyGenerator,
  )
  expect(point(editor, [{_key: 'k0'}, 'children', {_key: 'k1'}])).toEqual({
    path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 0,
  })
  expect(
    point(editor, [{_key: 'k0'}, 'children', {_key: 'k1'}], {edge: 'end'}),
  ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0})
})

test('point returns zero for a span without text in a callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: spanKey, marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ] as never,
    keyGenerator,
  )
  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    }),
  )
  editor.snapshot.context.schema = schema
  editor.snapshot.context.containers = resolveContainers(schema, [
    defineContainer({type: 'callout', arrayField: 'content'}),
  ])
  expect(
    point(editor, [
      {_key: 'k2'},
      'content',
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
    ]),
  ).toEqual({
    path: [{_key: 'k2'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 0,
  })
  expect(
    point(
      editor,
      [{_key: 'k2'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
      {edge: 'end'},
    ),
  ).toEqual({
    path: [{_key: 'k2'}, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 0,
  })
})

test('point treats a misplaced root span as an object', () => {
  const keyGenerator = createTestKeyGenerator()
  const editor = createBareEditor(
    [{_type: 'span', _key: keyGenerator(), text: 'foo', marks: []}] as never,
    keyGenerator,
  )
  expect(point(editor, [{_key: 'k0'}], {edge: 'end'})).toEqual({
    path: [{_key: 'k0'}],
    offset: 0,
  })
})

test('point returns the end offset for a span in a root text block', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    keyGenerator,
  )
  expect(
    point(editor, [{_key: 'k0'}, 'children', {_key: 'k1'}], {edge: 'end'}),
  ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3})
})

test('point resolves both edges of a root text block to its spans', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const lastSpanKey = keyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: firstSpanKey, text: 'foo', marks: []},
          {_type: 'span', _key: lastSpanKey, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ],
    keyGenerator,
  )
  expect(point(editor, [{_key: 'k0'}], {edge: 'start'})).toEqual({
    path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 0,
  })
  expect(point(editor, [{_key: 'k0'}], {edge: 'end'})).toEqual({
    path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
    offset: 3,
  })
})
