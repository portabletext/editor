import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import type {EditorSelection} from '..'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {createTestKeyGenerator} from '../internal-utils/test-key-generator'
import {getCaretWordSelection} from './selector.get-caret-word-selection'

const keyGenerator = createTestKeyGenerator()

function snapshot(value: Array<PortableTextBlock>, selection: EditorSelection) {
  return createTestSnapshot({
    context: {
      value,
      selection,
      keyGenerator,
    },
  })
}

describe(getCaretWordSelection.name, () => {
  test('empty block', () => {
    expect(
      getCaretWordSelection(
        snapshot(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'span',
                  text: '',
                },
              ],
            },
          ],
          {
            anchor: {
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual(null)
  })

  test('inline object', () => {
    expect(
      getCaretWordSelection(
        snapshot(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'stock-ticker',
                  symbol: 'FOO',
                },
              ],
            },
          ],
          {
            anchor: {
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual(null)
  })

  test('between inline objects', () => {
    expect(
      getCaretWordSelection(
        snapshot(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'stock-ticker',
                  symbol: 'FOO',
                },
                {
                  _key: 'k2',
                  _type: 'span',
                  text: '',
                },
                {
                  _key: 'k3',
                  _type: 'stock-ticker',
                  symbol: 'BAR',
                },
              ],
            },
          ],
          {
            anchor: {
              path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual(null)
  })

  test('word between inline objects', () => {
    expect(
      getCaretWordSelection(
        snapshot(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'stock-ticker',
                  symbol: 'FOO',
                },
                {
                  _key: 'k2',
                  _type: 'span',
                  text: 'foo',
                },
                {
                  _key: 'k3',
                  _type: 'stock-ticker',
                  symbol: 'BAR',
                },
              ],
            },
          ],
          {
            anchor: {
              path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        offset: 3,
      },
    })
  })

  test('no formatting', () => {
    expect(
      getCaretWordSelection(
        snapshot(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _key: 'k1',
                  _type: 'span',
                  text: 'foo bar baz',
                },
              ],
            },
          ],
          {
            anchor: {
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
              offset: 5,
            },
            focus: {
              path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
              offset: 5,
            },
          },
        ),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 4,
      },
      focus: {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 7,
      },
    })
  })

  test('mixed formatting', () => {
    expect(
      getCaretWordSelection(
        snapshot(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  _key: 'k1',
                  text: 'f',
                  marks: ['strong'],
                },
                {
                  _type: 'span',
                  _key: 'k2',
                  marks: ['strong', 'em'],
                  text: 'oo b',
                },
                {
                  _type: 'span',
                  _key: 'k3',
                  marks: ['strong', 'em', 'underline'],
                  text: 'a',
                },
                {
                  _type: 'span',
                  _key: 'k4',
                  marks: ['strong', 'underline'],
                  text: 'r ba',
                },
                {
                  _type: 'span',
                  _key: 'k5',
                  marks: ['strong'],
                  text: 'z',
                },
              ],
            },
          ],
          {
            anchor: {
              path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        offset: 3,
      },
      focus: {
        path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
        offset: 1,
      },
    })
  })
})
