import type {PortableTextBlock} from '@sanity/types'
import {expect, test} from 'vitest'
import type {EditorSelection} from '..'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {getActiveAnnotations} from './selector.get-active-annotations'

function snapshot(value: Array<PortableTextBlock>, selection: EditorSelection) {
  return createTestSnapshot({
    context: {
      value,
      selection,
    },
  })
}

const link = {
  _key: 'k4',
  _type: 'link',
  href: 'https://example.com',
}

const comment = {
  _key: 'k5',
  _type: 'comment',
  comment: 'Consider rewriting this',
}

const block = {
  _type: 'block',
  _key: 'k0',
  children: [
    {
      _key: 'k1',
      _type: 'span',
      text: 'foo',
      marks: ['strong'],
    },
    {
      _type: 'span',
      _key: 'k2',
      text: 'bar',
      marks: [link._key, comment._key, 'strong'],
    },
    {
      _key: 'k3',
      _type: 'span',
      text: 'baz',
      marks: [comment._key, 'strong'],
    },
  ],
  markDefs: [link, comment],
}

test(getActiveAnnotations.name, () => {
  expect(getActiveAnnotations(snapshot([], null))).toEqual([])
  expect(getActiveAnnotations(snapshot([block], null))).toEqual([])
  expect(
    getActiveAnnotations(
      snapshot([block], {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      }),
    ),
  ).toEqual([])
  expect(
    getActiveAnnotations(
      snapshot([block], {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 3,
        },
      }),
    ),
  ).toEqual([link, comment])
  expect(
    getActiveAnnotations(
      snapshot([block], {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
        },
      }),
    ),
  ).toEqual([link, comment])
  expect(
    getActiveAnnotations(
      snapshot([block], {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
      }),
    ),
  ).toEqual([])
  expect(
    getActiveAnnotations(
      snapshot([block], {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
        },
      }),
    ),
  ).toEqual([comment])
  expect(
    getActiveAnnotations(
      snapshot([block], {
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
        },
      }),
    ),
  ).toEqual([])
})
