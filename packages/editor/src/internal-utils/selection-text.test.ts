import {expect, test} from 'vitest'
import {getSelectionText} from './selection-text'

test(getSelectionText.name, () => {
  const splitBlock = {
    _type: 'block',
    _key: 'A-4',
    style: 'normal',
    markDefs: [{_type: 'link', _key: 'A-5', href: 'https://example.com'}],
    children: [
      {_type: 'span', _key: 'A-3', text: 'foo ', marks: []},
      {_type: 'span', _key: 'A-7', marks: ['A-5'], text: 'bar'},
      {_type: 'span', _key: 'A-6', marks: [], text: ' baz'},
    ],
  }

  expect(
    getSelectionText([splitBlock], {
      anchor: {path: [{_key: 'A-4'}, 'children', {_key: 'A-7'}], offset: 0},
      focus: {path: [{_key: 'A-4'}, 'children', {_key: 'A-7'}], offset: 3},
    }),
  ).toEqual(['bar'])
})
