import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {isSelectionExpanded} from './selector.is-selection-expanded'

describe(isSelectionExpanded.name, () => {
  test('no selection', () => {
    const snapshot = createTestSnapshot({})

    expect(isSelectionExpanded(snapshot)).toBe(false)
  })

  test('collapsed selection', () => {
    const snapshot = createTestSnapshot({
      context: {
        value: [
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'foo',
              },
            ],
          },
        ],
        selection: {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        },
      },
    })

    expect(isSelectionExpanded(snapshot)).toBe(false)
  })

  test('expanded selection', () => {
    const snapshot = createTestSnapshot({
      context: {
        value: [
          {
            _key: 'k0',
            _type: 'block',
            children: [
              {
                _key: 'k1',
                _type: 'span',
                text: 'foo',
              },
            ],
          },
        ],
        selection: {
          anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
          focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        },
      },
    })

    expect(isSelectionExpanded(snapshot)).toBe(true)
  })
})
