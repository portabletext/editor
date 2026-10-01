import {describe, expect, test} from 'vitest'
import {droppedText} from './work-dropped'

describe(droppedText.name, () => {
  test('a typed text, a set span text and an inserted block each give a line', () => {
    expect(
      droppedText([
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
        },
        {
          type: 'set',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: 'baz',
        },
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: 'k2',
              children: [
                {_type: 'span', _key: 'k3', text: 'foo', marks: []},
                {_type: 'span', _key: 'k4', text: 'bar', marks: []},
              ],
            },
          ],
        },
      ]),
    ).toEqual('bar\nbaz\nfoobar')
  })

  test('a set of a whole block gives its text, and a style or a removal gives none', () => {
    expect(
      droppedText([
        {
          type: 'set',
          path: [{_key: 'k0'}],
          value: {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          },
        },
        {type: 'set', path: [{_key: 'k0'}, 'style'], value: 'h1'},
        {type: 'unset', path: [{_key: 'k0'}]},
      ]),
    ).toEqual('foo')
  })
})
