import {expect, test} from 'vitest'
import type {EditorSchema, EditorSelection} from '.'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {isActiveDecorator} from './selector.is-active-decorator'

test(isActiveDecorator.name, () => {
  function snapshot(selection: EditorSelection): EditorSnapshot {
    return {
      context: {
        converters: [],
        schema: {} as EditorSchema,
        keyGenerator: () => '',
        activeDecorators: [],
        value: [
          {
            _type: '_block',
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
        ],
        selection,
      },
    }
  }

  expect(
    isActiveDecorator('strong')(
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
  ).toBe(true)
  expect(
    isActiveDecorator('strong')(
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
  ).toBe(false)
})
