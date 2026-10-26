import {applyAll, insert, set, unset} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {diffValue} from './diff'
import {applyOnServer} from './test/fake-server'

describe(diffValue.name, () => {
  test('replaces only a keyless block among keyed blocks', () => {
    const shown = [
      block('a', 'foo'),
      block(undefined, 'bar'),
      block('c', 'baz'),
    ]
    const wanted = [
      block('a', 'foo'),
      block(undefined, 'barx'),
      block('c', 'baz'),
    ]
    const patches = diffValue(shown, wanted)

    expect({patches, result: applyAll(shown, patches)}).toEqual({
      patches: [set(block(undefined, 'barx'), [1])],
      result: wanted,
    })
  })

  test('replaces only the changed one of two blocks sharing a key', () => {
    const shown = [
      block('a', 'foo'),
      block('b', 'bar'),
      block('b', 'baz'),
      block('c', 'qux'),
    ]
    const wanted = [
      block('a', 'foo'),
      block('b', 'bar'),
      block('b', 'bazx'),
      block('c', 'qux'),
    ]
    const patches = diffValue(shown, wanted)

    expect({patches, result: applyAll(shown, patches)}).toEqual({
      patches: [set(block('b', 'bazx'), [2])],
      result: wanted,
    })
  })

  test('inserts by position a block whose key is repeated only in the wanted value', () => {
    const shown = [block('a', 'foo'), block('b', 'bar'), block('c', 'baz')]
    const wanted = [
      block('a', 'foo'),
      block('b', 'bar'),
      block('b', 'bar copy'),
      block('c', 'baz'),
    ]
    const patches = diffValue(shown, wanted)

    expect({patches, result: applyAll(shown, patches)}).toEqual({
      patches: [insert([block('b', 'bar copy')], 'before', [2])],
      result: wanted,
    })
  })

  test('removes by position a block whose key is repeated only in the shown value', () => {
    const shown = [
      block('a', 'foo'),
      block('b', 'bar'),
      block('b', 'bar'),
      block('c', 'baz'),
    ]
    const wanted = [block('a', 'foo'), block('b', 'bar'), block('c', 'baz')]
    const patches = diffValue(shown, wanted)

    expect({patches, result: applyAll(shown, patches)}).toEqual({
      patches: [unset([2])],
      result: wanted,
    })
  })

  test('replaces an ambiguous block between keyed inserts and removals', () => {
    const shown = [
      block('a', 'foo'),
      block(undefined, 'x'),
      block('d', 'gone'),
      block('c', 'baz'),
    ]
    const wanted = [
      block('n', 'new'),
      block('a', 'foo'),
      block(undefined, 'y'),
      block('c', 'baz'),
      block('e', 'end'),
    ]
    const patches = diffValue(shown, wanted)

    expect({patches, result: applyAll(shown, patches)}).toEqual({
      patches: [
        unset([{_key: 'd'}]),
        insert([block('n', 'new')], 'before', [{_key: 'a'}]),
        set(block(undefined, 'y'), [2]),
        insert([block('e', 'end')], 'after', [{_key: 'c'}]),
      ],
      result: wanted,
    })
  })

  test('addresses each ambiguous removal at the index it has when it applies', () => {
    const shown = [
      block(undefined, 'p'),
      block('a', 'foo'),
      block(undefined, 'q'),
      block(undefined, 'r'),
      block('c', 'baz'),
    ]
    const wanted = [block('a', 'foo'), block(undefined, 's'), block('c', 'baz')]
    const patches = diffValue(shown, wanted)

    expect({patches, result: applyAll(shown, patches)}).toEqual({
      patches: [unset([0]), set(block(undefined, 's'), [1]), unset([2])],
      result: wanted,
    })
  })

  test('replaces only a keyless span among keyed spans', () => {
    const shown = [
      {
        ...block('b1', 'foo'),
        children: [span('s1', 'foo'), span(undefined, 'bar')],
      },
    ]
    const wanted = [
      {
        ...block('b1', 'foo'),
        children: [span('s1', 'foo'), span(undefined, 'barx')],
      },
    ]
    const patches = diffValue(shown, wanted)

    expect({patches, result: applyAll(shown, patches)}).toEqual({
      patches: [set(span(undefined, 'barx'), [{_key: 'b1'}, 'children', 1])],
      result: wanted,
    })
  })

  test('replaces the whole list when no block can be identified', () => {
    const shown = [block(undefined, 'foo'), block(undefined, 'bar')]
    const wanted = [block(undefined, 'foo'), block(undefined, 'baz')]
    const patches = diffValue(shown, wanted)

    expect({patches, result: applyAll(shown, patches)}).toEqual({
      patches: [set(wanted, [])],
      result: wanted,
    })
  })

  test('takes any keyed list to any other with keys dropped or repeated', () => {
    const random = seededRandom(1)
    const failures: Array<{
      shown: Array<PortableTextBlock>
      wanted: Array<PortableTextBlock>
    }> = []

    for (let run = 0; run < 2_000; run++) {
      const shown = randomList(random)
      const wanted = randomList(random)
      const patches = diffValue(shown, wanted)
      const changedKeys = new Set(
        patches.flatMap((patch) => {
          const head = patch.path[0]
          const changesItem = patch.type !== 'insert' || patch.path.length > 1

          return changesItem && typeof head === 'object' && '_key' in head
            ? [head._key]
            : []
        }),
      )
      const commonKeys = (list: Array<PortableTextBlock>) =>
        list
          .map((item) => item._key)
          .filter((key) => isUnique(shown, key) && isUnique(wanted, key))
      const keptOrder =
        JSON.stringify(commonKeys(shown)) === JSON.stringify(commonKeys(wanted))
      const untouchedKeys = (keptOrder ? shown : []).flatMap((item) =>
        isUnique(shown, item._key) &&
        isUnique(wanted, item._key) &&
        JSON.stringify(wanted.find((other) => other._key === item._key)) ===
          JSON.stringify(item)
          ? [item._key]
          : [],
      )

      if (
        JSON.stringify(applyAll(shown, patches)) !== JSON.stringify(wanted) ||
        JSON.stringify(applyOnServer(shown, patches)) !==
          JSON.stringify(wanted) ||
        untouchedKeys.some((key) => changedKeys.has(key))
      ) {
        failures.push({shown, wanted})
      }
    }

    expect(failures).toEqual([])
  })
})

function isUnique(list: Array<PortableTextBlock>, key: string | undefined) {
  return (
    key !== undefined && list.filter((item) => item._key === key).length === 1
  )
}

function block(key: string | undefined, text: string): PortableTextBlock {
  return {
    _type: 'block',
    ...(key === undefined ? {} : {_key: key}),
    style: 'normal',
    markDefs: [],
    children: [span(`${key ?? 'none'}-s`, text)],
  } as PortableTextBlock
}

function span(key: string | undefined, text: string) {
  return {
    _type: 'span',
    ...(key === undefined ? {} : {_key: key}),
    text,
    marks: [],
  }
}

function randomList(random: () => number): Array<PortableTextBlock> {
  const keys = ['a', 'b', 'c', 'd', 'e']
  const length = Math.floor(random() * 6)

  return Array.from({length}, () => {
    const roll = random()
    const key =
      roll < 0.2 ? undefined : keys[Math.floor(random() * keys.length)]

    return block(key, ['foo', 'bar', 'baz'][Math.floor(random() * 3)]!)
  })
}

function seededRandom(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    return state / 2_147_483_648
  }
}
