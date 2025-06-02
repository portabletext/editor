import type {PortableTextBlock} from '@sanity/types'
import {expect, test} from 'vitest'
import type {IndexedEditorSelection} from '../editor/editor-selection'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {isActiveDecorator} from './selector.is-active-decorator'

test(isActiveDecorator.name, () => {
  function snapshot(
    value: Array<PortableTextBlock>,
    selection: IndexedEditorSelection,
  ) {
    return createTestSnapshot({
      context: {
        value,
        selection,
      },
    })
  }

  expect(
    isActiveDecorator('strong')(
      snapshot(
        [
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
        ],
        {
          anchor: {
            path: [0, 0],
            offset: 0,
          },
          focus: {
            path: [0, 0],
            offset: 3,
          },
        },
      ),
    ),
  ).toBe(true)

  expect(
    isActiveDecorator('strong')(
      snapshot(
        [
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
        ],
        {
          anchor: {
            path: [0, 0],
            offset: 2,
          },
          focus: {
            path: [0, 1],
            offset: 3,
          },
        },
      ),
    ),
  ).toBe(false)

  expect(
    isActiveDecorator('strong')(
      snapshot(
        [
          {_key: 'b0', _type: 'image'},
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
                marks: ['strong'],
              },
            ],
          },
          {
            _key: 'b2',
            _type: 'block',
            children: [
              {_key: 's3', _type: 'span', text: '', marks: ['strong']},
            ],
          },
        ],
        {
          anchor: {
            path: [0],
            offset: 0,
          },
          focus: {
            path: [2, 0],
            offset: 0,
          },
        },
      ),
    ),
  ).toBe(true)
})
