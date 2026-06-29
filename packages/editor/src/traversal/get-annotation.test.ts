import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {defineContainer} from '../renderers/renderer.types'
import {getAnnotation} from './get-annotation'
import {resolveTestbedContainers} from './node-traversal-testbed'

function createAnnotationTestbed() {
  const keyGenerator = createTestKeyGenerator()

  const link1 = {_key: 'mark1', _type: 'link', href: 'https://a'}
  const link2 = {_key: 'mark2', _type: 'link', href: 'https://b'}
  const span1 = {
    _key: keyGenerator(),
    _type: 'span',
    text: 'linked',
    marks: ['mark1'],
  }
  const textBlock = {
    _key: keyGenerator(),
    _type: 'block',
    children: [span1],
    markDefs: [link1, link2],
  }

  const nestedLink = {_key: 'nested-mark', _type: 'link', href: 'https://c'}
  const nestedSpan = {
    _key: keyGenerator(),
    _type: 'span',
    text: 'nested',
    marks: ['nested-mark'],
  }
  const nestedBlock = {
    _key: keyGenerator(),
    _type: 'block',
    children: [nestedSpan],
    markDefs: [nestedLink],
  }
  const weirdContainer = {
    _key: keyGenerator(),
    _type: 'weird-container',
    markDefs: [nestedBlock],
  }

  const schema = compileSchema(
    defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      blockObjects: [
        {
          name: 'weird-container',
          fields: [
            {
              name: 'markDefs',
              type: 'array',
              of: [{type: 'block'}],
            },
          ],
        },
      ],
    }),
  )

  const weirdContainerDef = defineContainer({
    type: 'weird-container',
    arrayField: 'markDefs',
  })

  const value = [textBlock, weirdContainer]
  const containers = resolveTestbedContainers(schema, [weirdContainerDef])
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps(
    {schema, containers, value},
    {blockIndexMap, listIndexMap: new Map<string, number>()},
  )

  const snapshot = {
    context: {schema, containers, value},
    blockIndexMap,
  }

  return {
    snapshot,
    textBlock,
    link1,
    link2,
    weirdContainer,
    nestedBlock,
    nestedLink,
  }
}

describe(getAnnotation.name, () => {
  const testbed = createAnnotationTestbed()

  test('empty path', () => {
    expect(getAnnotation(testbed.snapshot, [])).toBeUndefined()
  })

  test('path without markDefs', () => {
    expect(
      getAnnotation(testbed.snapshot, [{_key: testbed.textBlock._key}]),
    ).toBeUndefined()
  })

  test('annotation by key', () => {
    const entry = getAnnotation(testbed.snapshot, [
      {_key: testbed.textBlock._key},
      'markDefs',
      {_key: 'mark1'},
    ])
    expect(entry).toEqual({
      node: testbed.link1,
      path: [{_key: testbed.textBlock._key}, 'markDefs', {_key: 'mark1'}],
    })
  })

  test('second annotation by key', () => {
    const entry = getAnnotation(testbed.snapshot, [
      {_key: testbed.textBlock._key},
      'markDefs',
      {_key: 'mark2'},
    ])
    expect(entry?.node).toBe(testbed.link2)
  })

  test('annotation with trailing field segment', () => {
    const entry = getAnnotation(testbed.snapshot, [
      {_key: testbed.textBlock._key},
      'markDefs',
      {_key: 'mark1'},
      'href',
    ])
    expect(entry?.node).toBe(testbed.link1)
    expect(entry?.path).toEqual([
      {_key: testbed.textBlock._key},
      'markDefs',
      {_key: 'mark1'},
    ])
  })

  test('annotation key not found', () => {
    expect(
      getAnnotation(testbed.snapshot, [
        {_key: testbed.textBlock._key},
        'markDefs',
        {_key: 'nonexistent'},
      ]),
    ).toBeUndefined()
  })

  test('markDefs followed by a string segment', () => {
    expect(
      getAnnotation(testbed.snapshot, [
        {_key: testbed.textBlock._key},
        'markDefs',
        'href',
      ]),
    ).toBeUndefined()
  })

  test('markDefs as the final segment', () => {
    expect(
      getAnnotation(testbed.snapshot, [
        {_key: testbed.textBlock._key},
        'markDefs',
      ]),
    ).toBeUndefined()
  })

  test('markDefs on a container with a markDefs-named array field', () => {
    expect(
      getAnnotation(testbed.snapshot, [
        {_key: testbed.weirdContainer._key},
        'markDefs',
        {_key: testbed.nestedBlock._key},
      ]),
    ).toBeUndefined()
  })

  test('block path does not exist', () => {
    expect(
      getAnnotation(testbed.snapshot, [
        {_key: 'nonexistent'},
        'markDefs',
        {_key: 'mark1'},
      ]),
    ).toBeUndefined()
  })

  test('annotation on a text block inside a container with markDefs-named array field', () => {
    const entry = getAnnotation(testbed.snapshot, [
      {_key: testbed.weirdContainer._key},
      'markDefs',
      {_key: testbed.nestedBlock._key},
      'markDefs',
      {_key: testbed.nestedLink._key},
    ])
    expect(entry).toEqual({
      node: testbed.nestedLink,
      path: [
        {_key: testbed.weirdContainer._key},
        'markDefs',
        {_key: testbed.nestedBlock._key},
        'markDefs',
        {_key: testbed.nestedLink._key},
      ],
    })
  })
})
