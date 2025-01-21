import {expect, test} from 'vitest'
import {getSelectedSpans, type EditorSchema, type EditorSelection} from '.'
import type {EditorSnapshot} from '../editor/editor-snapshot'

test(getSelectedSpans.name, () => {
  function snapshot(selection: EditorSelection): EditorSnapshot {
    return {
      context: {
        converters: [],
        schema: {} as EditorSchema,
        keyGenerator: () => '',
        activeDecorators: [],
        value: [
          {
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
          },
          {
            _type: 'image',
            _key: 'b2',
          },
          {
            _type: 'block',
            _key: 'b3',
            children: [
              {
                _type: 'span',
                _key: 's3',
                text: 'baz',
              },
            ],
          },
        ],
        selection,
      },
    }
  }

  expect(
    getSelectedSpans(
      snapshot({
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

  expect(
    getSelectedSpans(
      snapshot({
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

  expect(
    getSelectedSpans(
      snapshot({
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
