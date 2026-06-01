import {describe, expect, test} from 'vitest'
import {getValue} from './get-value'

describe(getValue.name, () => {
  test('resolves root-level node by key', () => {
    expect(getValue([{_key: 'b0', _type: 'block'}], [{_key: 'b0'}])).toEqual({
      _key: 'b0',
      _type: 'block',
    })
  })

  test('resolves string property on a node', () => {
    expect(
      getValue(
        [{_key: 'b0', _type: 'block', style: 'h1'}],
        [{_key: 'b0'}, 'style'],
      ),
    ).toEqual('h1')
  })

  test('resolves deep nested property', () => {
    expect(
      getValue(
        [{_key: 'b0', meta: {author: {name: 'Alice'}}}],
        [{_key: 'b0'}, 'meta', 'author', 'name'],
      ),
    ).toEqual('Alice')
  })

  test('resolves child in nested array by key', () => {
    expect(
      getValue(
        [{_key: 'b0', children: [{_key: 's0', text: 'hello'}]}],
        [{_key: 'b0'}, 'children', {_key: 's0'}],
      ),
    ).toEqual({_key: 's0', text: 'hello'})
  })

  test('resolves property on nested child', () => {
    expect(
      getValue(
        [{_key: 'b0', children: [{_key: 's0', text: 'hello'}]}],
        [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
      ),
    ).toEqual('hello')
  })

  test('resolves by numeric index', () => {
    expect(getValue([{_key: 'b0'}, {_key: 'b1', _type: 'image'}], [1])).toEqual(
      {_key: 'b1', _type: 'image'},
    )
  })

  test('returns undefined for missing key', () => {
    expect(getValue([{_key: 'b0'}], [{_key: 'missing'}])).toEqual(undefined)
  })

  test('returns undefined for missing property', () => {
    expect(
      getValue([{_key: 'b0', _type: 'block'}], [{_key: 'b0'}, 'nonexistent']),
    ).toEqual(undefined)
  })

  test('returns undefined for property on missing intermediate', () => {
    expect(getValue([{_key: 'b0'}], [{_key: 'b0'}, 'meta', 'author'])).toEqual(
      undefined,
    )
  })

  test('returns null for property that is null', () => {
    expect(
      getValue([{_key: 'b0', field: null}], [{_key: 'b0'}, 'field']),
    ).toEqual(null)
  })

  test('returns null when walking through null intermediate', () => {
    expect(
      getValue([{_key: 'b0', field: null}], [{_key: 'b0'}, 'field', 'nested']),
    ).toEqual(null)
  })

  test('returns undefined when walking through undefined intermediate', () => {
    expect(getValue([{_key: 'b0'}], [{_key: 'b0'}, 'field', 'nested'])).toEqual(
      undefined,
    )
  })

  test('resolves container depth path', () => {
    expect(
      getValue(
        [
          {
            _key: 'table',
            rows: [
              {
                _key: 'row',
                cells: [
                  {
                    _key: 'cell',
                    content: [{_key: 'b0', text: 'hello'}],
                  },
                ],
              },
            ],
          },
        ],
        [
          {_key: 'table'},
          'rows',
          {_key: 'row'},
          'cells',
          {_key: 'cell'},
          'content',
        ],
      ),
    ).toEqual([{_key: 'b0', text: 'hello'}])
  })

  test('resolves deep property on a deeply nested node', () => {
    expect(
      getValue(
        [
          {
            _key: 'table',
            rows: [
              {
                _key: 'row',
                cells: [
                  {
                    _key: 'cell',
                    meta: {
                      alignment: 'center',
                      style: {background: 'red'},
                    },
                  },
                ],
              },
            ],
          },
        ],
        [
          {_key: 'table'},
          'rows',
          {_key: 'row'},
          'cells',
          {_key: 'cell'},
          'meta',
          'style',
          'background',
        ],
      ),
    ).toEqual('red')
  })

  test('returns undefined for out-of-bounds numeric index', () => {
    expect(getValue([{_key: 'b0'}], [5])).toEqual(undefined)
  })

  test('returns undefined for keyed segment on non-array', () => {
    expect(
      getValue(
        [{_key: 'b0', field: 'string'}],
        [{_key: 'b0'}, 'field', {_key: 'nope'}],
      ),
    ).toEqual(undefined)
  })

  test('returns undefined for numeric segment on non-array', () => {
    expect(
      getValue([{_key: 'b0', field: 'string'}], [{_key: 'b0'}, 'field', 0]),
    ).toEqual(undefined)
  })

  test('returns undefined for empty path', () => {
    expect(getValue([{_key: 'b0'}], [])).toEqual([{_key: 'b0'}])
  })
})
