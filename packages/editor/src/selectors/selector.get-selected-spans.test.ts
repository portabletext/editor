import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {getSelectedSpans, type EditorSchema, type EditorSelection} from '.'
import type {EditorSnapshot} from '../editor/editor-snapshot'

const fooBar = {
  _type: 'block',
  _key: 'b1',
  children: [
    {
      _type: 'span',
      _key: 's1',
      text: 'foo',
      marks: ['strong'],
    },
    {
      _type: 'span',
      _key: 's2',
      text: 'bar',
    },
  ],
}
const image = {
  _type: 'image',
  _key: 'b2',
}
const baz = {
  _type: 'block',
  _key: 'b3',
  children: [
    {
      _type: 'span',
      _key: 's3',
      text: 'baz',
    },
  ],
}

describe(getSelectedSpans.name, () => {
  function snapshot(
    value: Array<PortableTextBlock>,
    selection: EditorSelection,
  ): EditorSnapshot {
    return {
      context: {
        converters: [],
        schema: {} as EditorSchema,
        keyGenerator: () => '',
        activeDecorators: [],
        value,
        selection,
      },
    }
  }

  test('selecting a single span', () => {
    expect(
      getSelectedSpans(
        snapshot([fooBar, image, baz], {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 3,
          },
        }),
      ),
    ).toEqual([
      {
        node: {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      },
    ])
  })

  test('selecting from start-span to start-span', () => {
    expect(
      getSelectedSpans(
        snapshot([fooBar], {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's2'}],
            offset: 0,
          },
        }),
      ),
    ).toEqual([
      {
        node: {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      },
    ])
  })

  test('selection from mid-span to mid-span', () => {
    expect(
      getSelectedSpans(
        snapshot([fooBar], {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 2,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's2'}],
            offset: 3,
          },
        }),
      ),
    ).toEqual([
      {
        node: {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      },
      {
        node: {_type: 'span', _key: 's2', text: 'bar'},
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      },
    ])
  })

  test('selecting from end-span to end-span', () => {
    expect(
      getSelectedSpans(
        snapshot([fooBar], {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 3,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's2'}],
            offset: 3,
          },
        }),
      ),
    ).toEqual([
      {
        node: {_type: 'span', _key: 's2', text: 'bar'},
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      },
    ])
  })

  test('selecting from start-span to start-span across blocks', () => {
    expect(
      getSelectedSpans(
        snapshot([fooBar, baz], {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's2'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'b3'}, 'children', {_key: 's3'}],
            offset: 0,
          },
        }),
      ),
    ).toEqual([
      {
        node: {_type: 'span', _key: 's2', text: 'bar'},
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      },
    ])
  })

  test('selecting from mid-span to mid-span across blocks', () => {
    expect(
      getSelectedSpans(
        snapshot([fooBar, image, baz], {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 2,
          },
          focus: {
            path: [{_key: 'b3'}, 'children', {_key: 's3'}],
            offset: 2,
          },
        }),
      ),
    ).toEqual([
      {
        node: {_type: 'span', _key: 's1', text: 'foo', marks: ['strong']},
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      },
      {
        node: {_type: 'span', _key: 's2', text: 'bar'},
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      },
      {
        node: {_type: 'span', _key: 's3', text: 'baz'},
        path: [{_key: 'b3'}, 'children', {_key: 's3'}],
      },
    ])
  })

  test('selecting from end-span to end-span across blocks', () => {
    expect(
      getSelectedSpans(
        snapshot([fooBar, baz], {
          anchor: {
            path: [{_key: 'b1'}, 'children', {_key: 's2'}],
            offset: 3,
          },
          focus: {
            path: [{_key: 'b3'}, 'children', {_key: 's3'}],
            offset: 3,
          },
        }),
      ),
    ).toEqual([
      {
        node: {_type: 'span', _key: 's3', text: 'baz'},
        path: [{_key: 'b3'}, 'children', {_key: 's3'}],
      },
    ])
  })
})
