import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {
  createWrapperKeys,
  imageBlock,
  loadContainers,
  loadDepths,
  loadPositions,
  loadSchemaDefinition,
  positionIndex,
  textBlock,
} from '../../test-utils/load-depths'
import type {EditorSchema} from '../editor/editor-schema'
import {resolveTestbedContainers} from '../traversal/node-traversal-testbed'
import {reconcileValue} from './reconcile-value'

const schema: EditorSchema = compileSchema(loadSchemaDefinition)
const containers = resolveTestbedContainers(schema, loadContainers)

describe(reconcileValue.name, () => {
  test.each(
    loadDepths.flatMap((depth) =>
      loadPositions.map((position) => ({depth, position})),
    ),
  )(
    'changes the text of the $position span at $depth.name by text edits',
    ({depth, position}) => {
      const wrapperKey = createWrapperKeys(counter())
      const target = positionIndex(position)
      const current = depth.wrap(
        ['a', 'b', 'c'].map((key) => textBlock(key, `${key}-span`, 'foo bar')),
        wrapperKey,
      )
      const next = depth.wrap(
        ['a', 'b', 'c'].map((key, index) =>
          textBlock(
            key,
            `${key}-span`,
            index === target ? 'foo baz' : 'foo bar',
          ),
        ),
        wrapperKey,
      )
      const spanPath = [
        ...current.prefix,
        {_key: ['a', 'b', 'c'][target]!},
        'children',
        {_key: `${['a', 'b', 'c'][target]!}-span`},
      ]

      expect(
        reconcileValue({
          schema,
          containers,
          current: current.value,
          next: next.value,
        }),
      ).toEqual([
        {type: 'remove.text', path: spanPath, offset: 6, text: 'r'},
        {type: 'insert.text', path: spanPath, offset: 6, text: 'z'},
      ])
    },
  )

  test.each(loadDepths)(
    'unsets a gone key and inserts a new one at $name',
    (depth) => {
      const wrapperKey = createWrapperKeys(counter())
      const current = depth.wrap(
        [textBlock('a', 'a-span', 'foo'), textBlock('b', 'b-span', 'bar')],
        wrapperKey,
      )
      const added = textBlock('c', 'c-span', 'baz')
      const next = depth.wrap(
        [textBlock('a', 'a-span', 'foo'), added],
        wrapperKey,
      )

      expect(
        reconcileValue({
          schema,
          containers,
          current: current.value,
          next: next.value,
        }),
      ).toEqual([
        {type: 'unset', path: [...current.prefix, {_key: 'b'}]},
        {
          type: 'insert',
          path: [...current.prefix, {_key: 'a'}],
          position: 'after',
          node: added,
        },
      ])
    },
  )

  test.each(loadDepths)(
    'replaces a node whose type changed under the same key at $name',
    (depth) => {
      const wrapperKey = createWrapperKeys(counter())
      const current = depth.wrap(
        [textBlock('a', 'a-span', 'foo'), textBlock('b', 'b-span', 'bar')],
        wrapperKey,
      )
      const retyped = imageBlock('b', 'bar.png')
      const next = depth.wrap(
        [textBlock('a', 'a-span', 'foo'), retyped],
        wrapperKey,
      )

      expect(
        reconcileValue({
          schema,
          containers,
          current: current.value,
          next: next.value,
        }),
      ).toEqual([
        {type: 'unset', path: [...current.prefix, {_key: 'b'}]},
        {
          type: 'insert',
          path: [...current.prefix, {_key: 'a'}],
          position: 'after',
          node: retyped,
        },
      ])
    },
  )

  test.each(loadDepths)(
    'gives no operations for an identical copy at $name',
    (depth) => {
      const wrapperKey = createWrapperKeys(counter())
      const blocks = [
        textBlock('a', 'a-span', 'foo'),
        textBlock('b', 'b-span', 'bar'),
      ]
      const current = depth.wrap(blocks, wrapperKey)

      expect(
        reconcileValue({
          schema,
          containers,
          current: current.value,
          next: structuredClone(current.value),
        }),
      ).toEqual([])
    },
  )

  test.each(loadDepths)(
    'matches siblings by index in an array that repeats a key at $name',
    (depth) => {
      const wrapperKey = createWrapperKeys(counter())
      const current = depth.wrap(
        [textBlock('a', 'a-span', 'foo'), textBlock('a', 'a-span-2', 'bar')],
        wrapperKey,
      )
      const next = depth.wrap(
        [textBlock('a', 'a-span', 'foo'), textBlock('a', 'a-span-2', 'baz')],
        wrapperKey,
      )

      expect(
        reconcileValue({
          schema,
          containers,
          current: current.value,
          next: next.value,
        }),
      ).toEqual([
        {
          type: 'remove.text',
          path: [...current.prefix, 1, 'children', {_key: 'a-span-2'}],
          offset: 2,
          text: 'r',
        },
        {
          type: 'insert.text',
          path: [...current.prefix, 1, 'children', {_key: 'a-span-2'}],
          offset: 2,
          text: 'z',
        },
      ])
    },
  )

  test('does not descend into a field of a block object that is not a registered container', () => {
    const plainSchema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'gallery', fields: [{name: 'caption', type: 'string'}]},
        ],
      }),
    )

    expect(
      reconcileValue({
        schema: plainSchema,
        containers: new Map(),
        current: [{_type: 'gallery', _key: 'g', caption: 'foo'}],
        next: [{_type: 'gallery', _key: 'g', caption: 'bar'}],
      }),
    ).toEqual([{type: 'set', path: [{_key: 'g'}, 'caption'], value: 'bar'}])
  })
})

function counter() {
  let count = 0
  return () => `w${count++}`
}
