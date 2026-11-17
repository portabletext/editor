import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test} from 'vitest'
import {createBareEditor} from '../../../test-utils/create-bare-editor.test-util'
import {defineContainer} from '../../renderers/renderer.types'
import {resolveContainers} from '../../schema/resolve-containers'
import {positions} from './positions'

test('positions yields one position for a span without text at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'block',
        _key: keyGenerator(),
        children: [
          {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          {_type: 'span', _key: keyGenerator(), marks: []},
          {_type: 'span', _key: keyGenerator(), text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ] as never,
    keyGenerator,
  )
  expect([...positions(editor, {at: []})]).toEqual([
    {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
    {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
    {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 0},
    {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 0},
    {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 1},
    {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 2},
    {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], offset: 3},
  ])
})

test('positions yields one position for a span without text in a callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const editor = createBareEditor(
    [
      {
        _type: 'callout',
        _key: keyGenerator(),
        content: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
              {_type: 'span', _key: keyGenerator(), marks: []},
              {_type: 'span', _key: keyGenerator(), text: 'bar', marks: []},
            ],
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
  expect([...positions(editor, {at: []})]).toEqual([
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
      offset: 0,
    },
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
      offset: 1,
    },
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
      offset: 2,
    },
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
      offset: 3,
    },
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k3'}],
      offset: 0,
    },
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k4'}],
      offset: 0,
    },
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k4'}],
      offset: 1,
    },
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k4'}],
      offset: 2,
    },
    {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k4'}],
      offset: 3,
    },
  ])
})
