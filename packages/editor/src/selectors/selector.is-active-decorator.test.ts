import {expect, test} from 'vitest'
import type {EditorSelection, PortableTextBlock} from '..'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {isActiveDecorator} from './selector.is-active-decorator'

test(isActiveDecorator.name, () => {
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
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
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
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 2,
          },
          focus: {
            path: [{_key: 'b1'}, 'children', {_key: 's2'}],
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
            path: [{_key: 'b0'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'b2'}, 'children', {_key: 's3'}],
            offset: 0,
          },
        },
      ),
    ),
  ).toBe(true)
})
