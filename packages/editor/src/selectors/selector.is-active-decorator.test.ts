import {expect, test} from 'vitest'
import type {EditorSelection} from '..'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {isActiveDecorator} from './selector.is-active-decorator'

test(isActiveDecorator.name, () => {
  function snapshot(selection: EditorSelection) {
    return createTestSnapshot({
      context: {
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
    })
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
