import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import type {EditorSelector} from '../editor/editor-selector'
import {defaultKeyGenerator} from '../editor/key-generator'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {getListIndex} from './selector.get-list-state'

function blockObject(_key: string, name: string) {
  return {
    _key,
    _type: name,
  }
}

function textBlock(
  _key: string,
  {
    listItem,
    level,
  }: {
    listItem?: 'bullet' | 'number'
    level?: number
  },
): PortableTextBlock {
  return {
    _key,
    _type: 'block',
    children: [
      {
        _key: defaultKeyGenerator(),
        _type: 'span',
        text: `${listItem}-${level}`,
      },
    ],
    style: 'normal',
    level,
    listItem,
  }
}

function createSnapshot(value: Array<PortableTextBlock>) {
  return createTestSnapshot({
    context: {
      value,
    },
  })
}

function getListStates(
  paths: Array<[{_key: string}]>,
): EditorSelector<Array<number | undefined>> {
  return (snapshot) => {
    return paths.map((path) => getListIndex({path})(snapshot))
  }
}

describe(getListIndex.name, () => {
  test('empty', () => {
    const snapshot = createSnapshot([])

    expect(getListIndex({path: [{_key: 'k0'}]})(snapshot)).toEqual(undefined)
  })

  test('single list item', () => {
    const snapshot = createSnapshot([
      textBlock('k0', {listItem: 'number', level: 1}),
    ])

    expect(getListIndex({path: [{_key: 'k0'}]})(snapshot)).toEqual(1)
  })

  test('single indented list item', () => {
    const snapshot = createSnapshot([
      textBlock('k0', {listItem: 'number', level: 2}),
    ])

    expect(getListIndex({path: [{_key: 'k0'}]})(snapshot)).toEqual(1)
  })

  test('two lists broken up by a paragraph', () => {
    const snapshot = createSnapshot([
      textBlock('k0', {listItem: 'number', level: 1}),
      textBlock('k1', {listItem: 'number', level: 1}),
      textBlock('k2', {}),
      textBlock('k3', {listItem: 'number', level: 1}),
      textBlock('k4', {listItem: 'number', level: 1}),
    ])

    expect(
      getListStates([
        [{_key: 'k0'}],
        [{_key: 'k1'}],
        [{_key: 'k2'}],
        [{_key: 'k3'}],
        [{_key: 'k4'}],
      ])(snapshot),
    ).toEqual([1, 2, undefined, 1, 2])
  })

  test('two lists broken up by an image', () => {
    const snapshot = createSnapshot([
      textBlock('k0', {listItem: 'number', level: 1}),
      textBlock('k1', {listItem: 'number', level: 1}),
      blockObject('k2', 'image'),
      textBlock('k3', {listItem: 'number', level: 1}),
      textBlock('k4', {listItem: 'number', level: 1}),
    ])

    expect(
      getListStates([
        [{_key: 'k0'}],
        [{_key: 'k1'}],
        [{_key: 'k2'}],
        [{_key: 'k3'}],
        [{_key: 'k4'}],
      ])(snapshot),
    ).toEqual([1, 2, undefined, 1, 2])
  })

  test('numbered lists broken up by a bulleted list', () => {
    const snapshot = createSnapshot([
      textBlock('k0', {listItem: 'number', level: 1}),
      textBlock('k1', {listItem: 'bullet', level: 1}),
      textBlock('k2', {listItem: 'number', level: 1}),
    ])

    expect(
      getListStates([[{_key: 'k0'}], [{_key: 'k1'}], [{_key: 'k2'}]])(snapshot),
    ).toEqual([1, 1, 1])
  })

  test('simple indented list', () => {
    const snapshot = createSnapshot([
      textBlock('k0', {listItem: 'number', level: 1}),
      textBlock('k1', {listItem: 'number', level: 2}),
      textBlock('k2', {listItem: 'number', level: 2}),
      textBlock('k3', {listItem: 'number', level: 1}),
    ])

    expect(
      getListStates([
        [{_key: 'k0'}],
        [{_key: 'k1'}],
        [{_key: 'k2'}],
        [{_key: 'k3'}],
      ])(snapshot),
    ).toEqual([1, 1, 2, 2])
  })

  test('reverse indented list', () => {
    const snapshot = createSnapshot([
      textBlock('k0', {listItem: 'number', level: 2}),
      textBlock('k1', {listItem: 'number', level: 1}),
      textBlock('k2', {listItem: 'number', level: 2}),
    ])

    expect(
      getListStates([[{_key: 'k0'}], [{_key: 'k1'}], [{_key: 'k2'}]])(snapshot),
    ).toEqual([1, 1, 1])
  })

  test('complex list', () => {
    const snapshot = createSnapshot([
      textBlock('k0', {listItem: 'number', level: 1}),
      textBlock('k1', {listItem: 'number', level: 3}),
      textBlock('k2', {listItem: 'number', level: 2}),
      textBlock('k3', {listItem: 'number', level: 3}),
      textBlock('k4', {listItem: 'number', level: 1}),
      textBlock('k5', {listItem: 'number', level: 3}),
      textBlock('k6', {listItem: 'number', level: 4}),
      textBlock('k7', {listItem: 'number', level: 3}),
      textBlock('k8', {listItem: 'number', level: 1}),
    ])

    expect(
      getListStates([
        [{_key: 'k0'}],
        [{_key: 'k1'}],
        [{_key: 'k2'}],
        [{_key: 'k3'}],
        [{_key: 'k4'}],
        [{_key: 'k5'}],
        [{_key: 'k6'}],
        [{_key: 'k7'}],
        [{_key: 'k8'}],
      ])(snapshot),
    ).toEqual([1, 1, 1, 1, 2, 1, 1, 2, 3])
  })
})
