import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {boundaryEquivalentSelections} from './boundary-equivalent'

const schema = compileSchema(defineSchema({}))
const containers = new Map()

describe(boundaryEquivalentSelections.name, () => {
  test('returns no variants when selection is null', () => {
    expect(
      boundaryEquivalentSelections(
        {context: {schema, value: [], containers}, blockIndexMap: new Map()},
        null,
      ),
    ).toEqual([])
  })

  test('returns no variants when point is in middle of span', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      children: [
        {_key: 's1', _type: 'span', text: 'foo'},
        {_key: 's2', _type: 'span', text: 'bar'},
      ],
    }
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 1,
    }
    expect(
      boundaryEquivalentSelections(
        {
          context: {schema, value: [block], containers},
          blockIndexMap: new Map(),
        },
        {anchor: point, focus: point, backward: false},
      ),
    ).toEqual([])
  })

  test('returns no variants when point is at boundary but no sibling span', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'foo'}],
    }
    const endOfS1 = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    expect(
      boundaryEquivalentSelections(
        {
          context: {schema, value: [block], containers},
          blockIndexMap: new Map(),
        },
        {anchor: endOfS1, focus: endOfS1, backward: false},
      ),
    ).toEqual([])
  })

  test('returns next-span variant for collapsed selection at end of span', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      children: [
        {_key: 's1', _type: 'span', text: 'foo'},
        {_key: 's2', _type: 'span', text: 'bar'},
      ],
    }
    const endOfS1 = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const startOfS2 = {
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 0,
    }
    expect(
      boundaryEquivalentSelections(
        {
          context: {schema, value: [block], containers},
          blockIndexMap: new Map(),
        },
        {anchor: endOfS1, focus: endOfS1, backward: false},
      ),
    ).toEqual([{anchor: startOfS2, focus: startOfS2, backward: false}])
  })

  test('returns previous-span variant for collapsed selection at start of span', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      children: [
        {_key: 's1', _type: 'span', text: 'foo'},
        {_key: 's2', _type: 'span', text: 'bar'},
      ],
    }
    const endOfS1 = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const startOfS2 = {
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 0,
    }
    expect(
      boundaryEquivalentSelections(
        {
          context: {schema, value: [block], containers},
          blockIndexMap: new Map(),
        },
        {anchor: startOfS2, focus: startOfS2, backward: false},
      ),
    ).toEqual([{anchor: endOfS1, focus: endOfS1, backward: false}])
  })

  test('returns no variant when sibling is an inline object, not a span', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      children: [
        {_key: 's1', _type: 'span', text: 'foo'},
        {_key: 'i1', _type: 'stock-ticker'},
      ],
    }
    const endOfS1 = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    expect(
      boundaryEquivalentSelections(
        {
          context: {schema, value: [block], containers},
          blockIndexMap: new Map(),
        },
        {anchor: endOfS1, focus: endOfS1, backward: false},
      ),
    ).toEqual([])
  })

  test('returns cartesian product for expanded selection with both endpoints at boundaries', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      children: [
        {_key: 's1', _type: 'span', text: 'foo'},
        {_key: 's2', _type: 'span', text: 'bar'},
        {_key: 's3', _type: 'span', text: 'baz'},
      ],
    }
    const endOfS1 = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const startOfS2 = {
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 0,
    }
    const endOfS2 = {
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 3,
    }
    const startOfS3 = {
      path: [{_key: 'b1'}, 'children', {_key: 's3'}],
      offset: 0,
    }
    expect(
      boundaryEquivalentSelections(
        {
          context: {schema, value: [block], containers},
          blockIndexMap: new Map(),
        },
        {anchor: endOfS1, focus: endOfS2, backward: false},
      ),
    ).toEqual([
      {anchor: endOfS1, focus: startOfS3, backward: false},
      {anchor: startOfS2, focus: endOfS2, backward: false},
      {anchor: startOfS2, focus: startOfS3, backward: false},
    ])
  })

  test('preserves backward flag in variants', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      children: [
        {_key: 's1', _type: 'span', text: 'foo'},
        {_key: 's2', _type: 'span', text: 'bar'},
      ],
    }
    const endOfS1 = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 3,
    }
    const startOfS2 = {
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 0,
    }
    expect(
      boundaryEquivalentSelections(
        {
          context: {schema, value: [block], containers},
          blockIndexMap: new Map(),
        },
        {anchor: endOfS1, focus: endOfS1, backward: true},
      ),
    ).toEqual([{anchor: startOfS2, focus: startOfS2, backward: true}])
  })
})
