import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import type {IndexedEditorSelection} from '../editor/indexed-selection'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {createTestKeyGenerator} from '../internal-utils/test-key-generator'
import {getCaretWordSelection} from './selector.get-caret-word-selection'

const keyGenerator = createTestKeyGenerator()

function snapshot(
  value: Array<PortableTextBlock>,
  selection: IndexedEditorSelection,
) {
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
              path: [0, 0],
              offset: 0,
            },
            focus: {
              path: [0, 0],
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
              path: [0, 0],
              offset: 0,
            },
            focus: {
              path: [0, 0],
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
              path: [0, 1],
              offset: 0,
            },
            focus: {
              path: [0, 1],
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
              path: [0, 1],
              offset: 0,
            },
            focus: {
              path: [0, 1],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual({
      anchor: {
        path: [0, 1],
        offset: 0,
      },
      focus: {
        path: [0, 1],
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
              path: [0, 0],
              offset: 5,
            },
            focus: {
              path: [0, 0],
              offset: 5,
            },
          },
        ),
      ),
    ).toEqual({
      anchor: {
        path: [0, 0],
        offset: 4,
      },
      focus: {
        path: [0, 0],
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
              path: [0, 2],
              offset: 0,
            },
            focus: {
              path: [0, 2],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual({
      anchor: {
        path: [0, 1],
        offset: 3,
      },
      focus: {
        path: [0, 3],
        offset: 1,
      },
    })
  })
})
