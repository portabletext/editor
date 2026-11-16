import {execFileSync} from 'node:child_process'
import {URL as NodeURL} from 'node:url'
import {describe, expect, test} from 'vitest'
import {safeParse} from '../internal-utils/safe-json'
import {deserializePath} from './deserialize-path'
import {serializePath} from './serialize-path'

describe(serializePath.name, () => {
  test('head true field', () => {
    expect(serializePath(['true'])).toEqual('true')
  })

  test('head false field', () => {
    expect(serializePath(['false'])).toEqual('false')
  })

  test('head null field', () => {
    expect(serializePath(['null'])).toEqual('null')
  })

  test('ordinary head field', () => {
    expect(serializePath(['body', 'content'])).toEqual('body.content')
  })

  test('empty path', () => {
    expect(serializePath([])).toEqual('')
  })

  test('single key segment', () => {
    expect(serializePath([{_key: 'k0'}])).toBe('[_key=="k0"]')
  })

  test('block and span', () => {
    expect(serializePath([{_key: 'k0'}, 'children', {_key: 's0'}])).toBe(
      '[_key=="k0"].children[_key=="s0"]',
    )
  })

  test('container path', () => {
    expect(
      serializePath([
        {_key: 'tableKey'},
        'rows',
        {_key: 'rowKey'},
        'cells',
        {_key: 'cellKey'},
        'content',
        {_key: 'blockKey'},
        'children',
        {_key: 'spanKey'},
      ]),
    ).toBe(
      '[_key=="tableKey"].rows[_key=="rowKey"].cells[_key=="cellKey"].content[_key=="blockKey"].children[_key=="spanKey"]',
    )
  })

  test('key with dot', () => {
    expect(serializePath([{_key: 'my.key'}, 'children', {_key: 's0'}])).toBe(
      '[_key=="my.key"].children[_key=="s0"]',
    )
  })
})

describe(deserializePath.name, () => {
  test('reads nothing from malformed ..', () => {
    expect(deserializePath('..')).toEqual([])
  })

  test('reads nothing from malformed ]', () => {
    expect(deserializePath(']')).toEqual([])
  })

  test('stops at a dot not followed by a field', () => {
    expect(deserializePath('body.[2]')).toEqual(['body'])
  })

  test('single key segment', () => {
    expect(deserializePath('[_key=="k0"]')).toEqual([{_key: 'k0'}])
  })

  test('block and span', () => {
    expect(deserializePath('[_key=="k0"].children[_key=="s0"]')).toEqual([
      {_key: 'k0'},
      'children',
      {_key: 's0'},
    ])
  })

  test('container path', () => {
    expect(
      deserializePath(
        '[_key=="tableKey"].rows[_key=="rowKey"].cells[_key=="cellKey"].content[_key=="blockKey"].children[_key=="spanKey"]',
      ),
    ).toEqual([
      {_key: 'tableKey'},
      'rows',
      {_key: 'rowKey'},
      'cells',
      {_key: 'cellKey'},
      'content',
      {_key: 'blockKey'},
      'children',
      {_key: 'spanKey'},
    ])
  })

  test('key with dot', () => {
    expect(deserializePath('[_key=="my.key"].children[_key=="s0"]')).toEqual([
      {_key: 'my.key'},
      'children',
      {_key: 's0'},
    ])
  })
})

describe('roundtrip', () => {
  test('round trip head true field', () => {
    expect(deserializePath(serializePath(['true']))).toEqual(['true'])
  })

  test('round trip true field after key', () => {
    expect(deserializePath(serializePath([{_key: 'k0'}, 'true']))).toEqual([
      {_key: 'k0'},
      'true',
    ])
  })

  test('round trip head false field', () => {
    expect(deserializePath(serializePath(['false']))).toEqual(['false'])
  })

  test('round trip false field after key', () => {
    expect(deserializePath(serializePath([{_key: 'k0'}, 'false']))).toEqual([
      {_key: 'k0'},
      'false',
    ])
  })

  test('round trip head null field', () => {
    expect(deserializePath(serializePath(['null']))).toEqual(['null'])
  })

  test('round trip null field after key', () => {
    expect(deserializePath(serializePath([{_key: 'k0'}, 'null']))).toEqual([
      {_key: 'k0'},
      'null',
    ])
  })

  test('round trip ordinary head field', () => {
    expect(deserializePath(serializePath(['body', 'content']))).toEqual([
      'body',
      'content',
    ])
  })

  test('round trip empty path', () => {
    expect(deserializePath(serializePath([]))).toEqual([])
  })

  test('round trip numeric field', () => {
    expect(
      deserializePath(serializePath([{_key: 'k'}, '0', {_key: 'a'}])),
    ).toEqual([{_key: 'k'}, '0', {_key: 'a'}])
  })

  test('single key segment', () => {
    const path = [{_key: 'k0'}] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })

  test('block and span', () => {
    const path = [{_key: 'k0'}, 'children', {_key: 's0'}] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })

  test('container path', () => {
    const path = [
      {_key: 'tableKey'},
      'rows',
      {_key: 'rowKey'},
      'cells',
      {_key: 'cellKey'},
      'content',
      {_key: 'blockKey'},
      'children',
      {_key: 'spanKey'},
    ] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })

  test('key with dot', () => {
    const path = [{_key: 'my.key'}, 'children', {_key: 's0'}] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })

  test('key with special characters', () => {
    const path = [
      {_key: 'key"with]brackets'},
      'children',
      {_key: 's0'},
    ] as const
    expect(deserializePath(serializePath([...path]))).toEqual([...path])
  })
})

describe('Sanity path format', () => {
  test('head index', () => {
    expect(serializePath([2])).toEqual('[2]')
  })
  test('index after field', () => {
    expect(serializePath(['body', 2])).toEqual('body[2]')
  })
  test('range', () => {
    expect(serializePath([[1, 3]])).toEqual('[1:3]')
  })
  test('open start range', () => {
    expect(serializePath([['', 3]])).toEqual('[:3]')
  })
  test('open end range', () => {
    expect(serializePath([[1, '']])).toEqual('[1:]')
  })
  test('true field after key', () => {
    expect(serializePath([{_key: 'k0'}, 'true'])).toEqual(
      '[_key=="k0"]["true"]',
    )
  })
  test('false field after key', () => {
    expect(serializePath([{_key: 'k0'}, 'false'])).toEqual(
      '[_key=="k0"]["false"]',
    )
  })
  test('null field after key', () => {
    expect(serializePath([{_key: 'k0'}, 'null'])).toEqual(
      '[_key=="k0"]["null"]',
    )
  })
  test('round trip head index', () => {
    expect(deserializePath(serializePath([2]))).toEqual([2])
  })
  test('round trip index after field', () => {
    expect(deserializePath(serializePath(['body', 2]))).toEqual(['body', 2])
  })
  test('round trip range', () => {
    expect(deserializePath(serializePath([[1, 3]]))).toEqual([[1, 3]])
  })
  test('round trip open start range', () => {
    expect(deserializePath(serializePath([['', 3]]))).toEqual([['', 3]])
  })
  test('round trip open end range', () => {
    expect(deserializePath(serializePath([[1, '']]))).toEqual([[1, '']])
  })
  test('round trip numeric index', () => {
    expect(deserializePath(serializePath([{_key: 'k'}, 'content', 0]))).toEqual(
      [{_key: 'k'}, 'content', 0],
    )
  })
  test('matches keys only at the current position', () => {
    expect(deserializePath('[_key=="k0"]["null"][_key=="k1"]')).toEqual([
      {_key: 'k0'},
      'null',
      {_key: 'k1'},
    ])
  })
  test('terminates on body[2]', () => {
    expect(safeParse(deserializeInChild('body[2]'))).toEqual(['body', 2])
  }, 15000)
  test('terminates on [_key==""]', () => {
    expect(safeParse(deserializeInChild('[_key==""]'))).toEqual([{_key: ''}])
  }, 15000)
  test('terminates on [', () => {
    expect(safeParse(deserializeInChild('['))).toEqual([])
  }, 15000)
  test('terminates on body[2', () => {
    expect(safeParse(deserializeInChild('body[2'))).toEqual(['body'])
  }, 15000)
})

function deserializeInChild(input: string) {
  return execFileSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--input-type=module',
      '-e',
      `const {deserializePath} = await import(process.argv[1])
       process.stdout.write(JSON.stringify(deserializePath(process.argv[2])))`,
      // Node's URL, so Vite does not rewrite `new URL(..., import.meta.url)`
      new NodeURL('./deserialize-path.ts', import.meta.url).href,
      input,
    ],
    {timeout: 10000, encoding: 'utf8'},
  )
}
