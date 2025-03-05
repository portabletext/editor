import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import type {EditorSelection} from '../types/editor'
import {isOverlappingSelection} from './selector.is-overlapping-selection'

function snapshot(selection: EditorSelection) {
  return createTestSnapshot({
    context: {
      selection,
      value: [
        {_type: 'image', _key: 'k0'},
        {
          _type: 'block',
          _key: 'k1',
          children: [
            {_type: 'span', _key: 'k3', text: 'foo'},
            {_type: 'stock-ticker', _key: 'k4'},
            {_type: 'span', _key: 'k5', text: 'bar'},
          ],
        },
        {_type: 'image', _key: 'k2'},
      ],
    },
  })
}

describe(isOverlappingSelection.name, () => {
  test('null', () => {
    expect(isOverlappingSelection(null)(snapshot(null))).toBe(false)
  })

  test('fully selected block object', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k0'}], offset: 0},
        focus: {path: [{_key: 'k0'}], offset: 0},
      })(
        snapshot({
          anchor: {path: [{_key: 'k0'}], offset: 0},
          focus: {path: [{_key: 'k0'}], offset: 0},
        }),
      ),
    ).toBe(true)
  })

  test('block object inside selection', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k0'}], offset: 0},
        focus: {path: [{_key: 'k0'}], offset: 0},
      })(
        snapshot({
          anchor: {path: [{_key: 'k0'}], offset: 0},
          focus: {path: [{_key: 'k2'}], offset: 0},
        }),
      ),
    ).toBe(true)
  })

  test('fully selected inline object', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
        focus: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
      })(
        snapshot({
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
        }),
      ),
    ).toBe(true)
  })

  test('inline object inside selection', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
        focus: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
      })(
        snapshot({
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 2},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 1},
        }),
      ),
    ).toBe(true)
  })

  test('selection right before', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 0},
        focus: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 2},
      })(
        snapshot({
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 2},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 1},
        }),
      ),
    ).toBe(false)
  })

  test('selection overlapping from the start', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 0},
        focus: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 3},
      })(
        snapshot({
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 2},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 1},
        }),
      ),
    ).toBe(true)
  })

  test('selection right after', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 2},
      })(
        snapshot({
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 2},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 1},
        }),
      ),
    ).toBe(false)
  })

  test('selection overlapping from the end', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 0},
        focus: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 2},
      })(
        snapshot({
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 2},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 1},
        }),
      ),
    ).toBe(true)
  })

  test('before inline object', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 2},
        focus: {path: [{_key: 'k1'}, 'children', {_key: 'k3'}], offset: 2},
      })(
        snapshot({
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
        }),
      ),
    ).toBe(false)
  })

  test('after inline object', () => {
    expect(
      isOverlappingSelection({
        anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 2},
        focus: {path: [{_key: 'k1'}, 'children', {_key: 'k5'}], offset: 2},
      })(
        snapshot({
          anchor: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
          focus: {path: [{_key: 'k1'}, 'children', {_key: 'k4'}], offset: 0},
        }),
      ),
    ).toBe(false)
  })
})
