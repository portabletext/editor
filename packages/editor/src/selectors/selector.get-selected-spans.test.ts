import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import type {EditorSelection} from '..'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {getSelectedSpans} from './selector.get-selected-spans'

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
  ) {
    return createTestSnapshot({
      context: {
        value,
        selection,
      },
    })
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

  test('selecting from block object to empty span', () => {
    expect(
      getSelectedSpans(
        snapshot(
          [
            image,
            baz,
            {
              _key: 'b4',
              _type: 'block',
              children: [{_key: 's4', _type: 'span', text: ''}],
            },
          ],
          {
            anchor: {
              path: [{_key: 'b2'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'b4'}, 'children', {_key: 's4'}],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual([
      {
        node: {_key: 's3', _type: 'span', text: 'baz'},
        path: [{_key: 'b3'}, 'children', {_key: 's3'}],
      },
    ])
  })

  test('selecting broken-up annotation', () => {
    expect(
      getSelectedSpans(
        createTestSnapshot({
          context: {
            value: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {
                    _type: 'span',
                    _key: 'b0-s0',
                    marks: [],
                    text: 'foo ',
                  },
                  {
                    _type: 'span',
                    _key: 'b0-s1',
                    marks: ['b0-a0'],
                    text: 'b',
                  },
                  {
                    _type: 'span',
                    _key: 'e0-k3',
                    marks: ['b0-a0', 'strong'],
                    text: 'a',
                  },
                  {
                    _type: 'span',
                    _key: 'e0-k2',
                    marks: ['b0-a0'],
                    text: 'r',
                  },
                  {
                    _type: 'span',
                    _key: 'b0-s2',
                    marks: [],
                    text: ' baz',
                  },
                ],
                markDefs: [
                  {
                    _type: 'link',
                    _key: 'b0-a0',
                    href: 'https://example.com',
                  },
                ],
                style: 'normal',
              },
            ],
            selection: {
              anchor: {
                path: [{_key: 'b0'}, 'children', {_key: 'b0-s1'}],
                offset: 0,
              },
              focus: {
                path: [{_key: 'b0'}, 'children', {_key: 'e0-k2'}],
                offset: 1,
              },
              backward: false,
            },
          },
        }),
      ),
    ).toEqual([
      {
        node: {
          _type: 'span',
          _key: 'b0-s1',
          marks: ['b0-a0'],
          text: 'b',
        },
        path: [{_key: 'b0'}, 'children', {_key: 'b0-s1'}],
      },
      {
        node: {
          _type: 'span',
          _key: 'e0-k3',
          marks: ['b0-a0', 'strong'],
          text: 'a',
        },
        path: [{_key: 'b0'}, 'children', {_key: 'e0-k3'}],
      },
      {
        node: {
          _type: 'span',
          _key: 'e0-k2',
          marks: ['b0-a0'],
          text: 'r',
        },
        path: [{_key: 'b0'}, 'children', {_key: 'e0-k2'}],
      },
    ])
  })
})
