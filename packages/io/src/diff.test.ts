import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  unset,
  type Patch,
  type Path,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
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

  test('diffs a span text edit inside a table cell as a text diff at its full keyed path', () => {
    const shown = [
      table('t1', [
        row('r1', [
          cell('c1', [textBlock('b1', 's1', 'foo')]),
          cell('c2', [textBlock('b2', 's2', 'bar')]),
        ]),
      ]),
    ]
    const wanted = [
      table('t1', [
        row('r1', [
          cell('c1', [textBlock('b1', 's1', 'foo')]),
          cell('c2', [textBlock('b2', 's2', 'bar baz')]),
        ]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        diffMatchPatch('bar', 'bar baz', [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c2'},
          'content',
          {_key: 'b2'},
          'children',
          {_key: 's2'},
          'text',
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('inserts a block inside a table cell by key', () => {
    const shown = [
      table('t1', [
        row('r1', [
          cell('c1', [textBlock('b1', 's1', 'foo')]),
          cell('c2', [textBlock('b2', 's2', 'bar')]),
        ]),
      ]),
    ]
    const wanted = [
      table('t1', [
        row('r1', [
          cell('c1', [
            textBlock('b1', 's1', 'foo'),
            textBlock('b3', 's3', 'baz'),
          ]),
          cell('c2', [textBlock('b2', 's2', 'bar')]),
        ]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        insert([textBlock('b3', 's3', 'baz')], 'after', [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('removes a block inside a table cell by key', () => {
    const shown = [
      table('t1', [
        row('r1', [
          cell('c1', [
            textBlock('b1', 's1', 'foo'),
            textBlock('b3', 's3', 'baz'),
          ]),
          cell('c2', [textBlock('b2', 's2', 'bar')]),
        ]),
      ]),
    ]
    const wanted = [
      table('t1', [
        row('r1', [
          cell('c1', [textBlock('b3', 's3', 'baz')]),
          cell('c2', [textBlock('b2', 's2', 'bar')]),
        ]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        unset([
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('diffs a span text edit inside a callout inside a callout as a text diff at its full keyed path', () => {
    const shown = [
      callout('o1', [
        textBlock('b1', 's1', 'foo'),
        callout('o2', [
          textBlock('b2', 's2', 'bar'),
          textBlock('b3', 's3', 'baz'),
        ]),
      ]),
    ]
    const wanted = [
      callout('o1', [
        textBlock('b1', 's1', 'foo'),
        callout('o2', [
          textBlock('b2', 's2', 'bar'),
          textBlock('b3', 's3', 'bazx'),
        ]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        diffMatchPatch('baz', 'bazx', [
          {_key: 'o1'},
          'content',
          {_key: 'o2'},
          'content',
          {_key: 'b3'},
          'children',
          {_key: 's3'},
          'text',
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('inserts and removes blocks inside a callout inside a callout by key', () => {
    const shown = [
      callout('o1', [
        textBlock('b1', 's1', 'foo'),
        callout('o2', [
          textBlock('b2', 's2', 'bar'),
          textBlock('b3', 's3', 'baz'),
        ]),
      ]),
    ]
    const wanted = [
      callout('o1', [
        textBlock('b1', 's1', 'foo'),
        callout('o2', [
          textBlock('b4', 's4', 'new'),
          textBlock('b3', 's3', 'baz'),
        ]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        unset([{_key: 'o1'}, 'content', {_key: 'o2'}, 'content', {_key: 'b2'}]),
        insert([textBlock('b4', 's4', 'new')], 'before', [
          {_key: 'o1'},
          'content',
          {_key: 'o2'},
          'content',
          {_key: 'b3'},
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('diffs a span text edit inside an image caption as a text diff at its full keyed path', () => {
    const shown = [
      textBlock('b1', 's1', 'foo'),
      image('i1', [textBlock('c1', 'cs1', 'a cat')]),
    ]
    const wanted = [
      textBlock('b1', 's1', 'foo'),
      image('i1', [textBlock('c1', 'cs1', 'a black cat')]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        diffMatchPatch('a cat', 'a black cat', [
          {_key: 'i1'},
          'caption',
          {_key: 'c1'},
          'children',
          {_key: 'cs1'},
          'text',
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('inserts and removes blocks inside an image caption by key', () => {
    const shown = [
      image('i1', [
        textBlock('c1', 'cs1', 'a cat'),
        textBlock('c2', 'cs2', 'photo: me'),
      ]),
    ]
    const wanted = [
      image('i1', [
        textBlock('c1', 'cs1', 'a cat'),
        textBlock('c3', 'cs3', 'on a mat'),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        unset([{_key: 'i1'}, 'caption', {_key: 'c2'}]),
        insert([textBlock('c3', 'cs3', 'on a mat')], 'after', [
          {_key: 'i1'},
          'caption',
          {_key: 'c1'},
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('replaces by position only the changed one of two cell blocks sharing a key', () => {
    const shown = [
      table('t1', [
        row('r1', [
          cell('c1', [
            textBlock('b1', 's1', 'foo'),
            textBlock('b1', 's2', 'bar'),
            textBlock('b4', 's4', 'qux'),
          ]),
          cell('c2', [textBlock('b2', 's3', 'baz')]),
        ]),
      ]),
    ]
    const wanted = [
      table('t1', [
        row('r1', [
          cell('c1', [
            textBlock('b1', 's1', 'foo'),
            textBlock('b1', 's2', 'barx'),
            textBlock('b4', 's4', 'qux'),
          ]),
          cell('c2', [textBlock('b2', 's3', 'baz')]),
        ]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        set(textBlock('b1', 's2', 'barx'), [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          1,
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('replaces by position only the changed one of two table cells sharing a key', () => {
    const shown = [
      table('t1', [
        row('r1', [
          cell('c1', [textBlock('b1', 's1', 'foo')]),
          cell('c1', [textBlock('b2', 's2', 'bar')]),
          cell('c4', [textBlock('b4', 's4', 'qux')]),
        ]),
        row('r2', [cell('c3', [textBlock('b3', 's3', 'baz')])]),
      ]),
    ]
    const wanted = [
      table('t1', [
        row('r1', [
          cell('c1', [textBlock('b1', 's1', 'foo')]),
          cell('c1', [textBlock('b2', 's2', 'barx')]),
          cell('c4', [textBlock('b4', 's4', 'qux')]),
        ]),
        row('r2', [cell('c3', [textBlock('b3', 's3', 'baz')])]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        set(cell('c1', [textBlock('b2', 's2', 'barx')]), [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          1,
        ]),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('replaces only the content list of a cell when none of its blocks can be identified', () => {
    const shown = [
      table('t1', [
        row('r1', [
          cell('c1', [block(undefined, 'foo'), block(undefined, 'bar')]),
          cell('c2', [textBlock('b2', 's2', 'baz')]),
        ]),
      ]),
    ]
    const wanted = [
      table('t1', [
        row('r1', [
          cell('c1', [block(undefined, 'foo'), block(undefined, 'barx')]),
          cell('c2', [textBlock('b2', 's2', 'baz')]),
        ]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        set(
          [block(undefined, 'foo'), block(undefined, 'barx')],
          [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'content',
          ],
        ),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('replaces only the caption of an image when none of its blocks can be identified', () => {
    const shown = [
      textBlock('b1', 's1', 'foo'),
      image('i1', [block(undefined, 'a cat')]),
    ]
    const wanted = [
      textBlock('b1', 's1', 'foo'),
      image('i1', [block(undefined, 'a black cat')]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [
        set([block(undefined, 'a black cat')], [{_key: 'i1'}, 'caption']),
      ],
      result: wanted,
      serverResult: wanted,
    })
  })

  test('removes by position a block whose key is repeated only in the shown inner callout', () => {
    const shown = [
      callout('o1', [
        callout('o2', [
          textBlock('b1', 's1', 'foo'),
          textBlock('b1', 's1', 'foo'),
          textBlock('b2', 's2', 'bar'),
        ]),
      ]),
    ]
    const wanted = [
      callout('o1', [
        callout('o2', [
          textBlock('b1', 's1', 'foo'),
          textBlock('b2', 's2', 'bar'),
        ]),
      ]),
    ]
    const patches = diffValue(shown, wanted)

    expect({
      patches,
      result: applyAll(shown, patches),
      serverResult: applyOnServer(shown, patches),
    }).toEqual({
      patches: [unset([{_key: 'o1'}, 'content', {_key: 'o2'}, 'content', 1])],
      result: wanted,
      serverResult: wanted,
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

  describe('aligning keyed lists', () => {
    const placements = ['first', 'middle', 'last'] as const

    for (const [name, nested] of [
      ['at the root', false],
      ['inside a callout', true],
    ] as const) {
      test(`takes the same patches as the quadratic alignment on generated lists ${name}`, () => {
        const keyGenerator = createTestKeyGenerator()
        const containerKey = keyGenerator()
        const path = containerPath(containerKey, nested)
        const random = seededRandom(7)
        const mismatches: Array<unknown> = []

        for (let run = 0; run < 600; run++) {
          const shownList = uniqueKeyList(
            random,
            2 + Math.floor(random() * 12),
            keyGenerator,
          )
          const wantedList = editList(
            shownList,
            random,
            placements[run % placements.length]!,
            run % 4,
            keyGenerator,
          )
          const shown = inContainer(shownList, containerKey, nested)
          const wanted = inContainer(wantedList, containerKey, nested)
          const patches = diffValue(shown, wanted)

          if (
            JSON.stringify(patches) !==
              JSON.stringify(referencePatches(shownList, wantedList, path)) ||
            JSON.stringify(applyAll(shown, patches)) !== JSON.stringify(wanted)
          ) {
            mismatches.push({shownList, wantedList})
          }
        }

        expect(mismatches).toEqual([])
      })

      test(`aligns keys with indexOf and Array.from counts that do not grow with the list ${name}`, () => {
        const keyGenerator = createTestKeyGenerator()
        const containerKey = keyGenerator()
        const shownList = Array.from({length: 50}, () =>
          block(keyGenerator(), 'foo'),
        )
        const wantedList = [...shownList.slice(1), shownList[0]!]
        const shown = inContainer(shownList, containerKey, nested)
        const wanted = inContainer(wantedList, containerKey, nested)
        const doubledKeyGenerator = createTestKeyGenerator()
        const doubledContainerKey = doubledKeyGenerator()
        const doubledShownList = Array.from({length: 100}, () =>
          block(doubledKeyGenerator(), 'foo'),
        )
        const doubledWantedList = [
          ...doubledShownList.slice(1),
          doubledShownList[0]!,
        ]
        const doubledShown = inContainer(
          doubledShownList,
          doubledContainerKey,
          nested,
        )
        const doubledWanted = inContainer(
          doubledWantedList,
          doubledContainerKey,
          nested,
        )
        const indexOfSpy = vi.spyOn(Array.prototype, 'indexOf')

        try {
          const fromSpy = vi.spyOn(Array, 'from')

          try {
            const patches = diffValue(shown, wanted)
            const calls = {
              indexOf: indexOfSpy.mock.calls.length,
              from: fromSpy.mock.calls.length,
            }
            indexOfSpy.mockClear()
            fromSpy.mockClear()

            diffValue(doubledShown, doubledWanted)

            expect({
              patches,
              doubledCalls: {
                indexOf: indexOfSpy.mock.calls.length,
                from: fromSpy.mock.calls.length,
              },
            }).toEqual({
              patches: [
                unset([...containerPath(containerKey, nested), {_key: 'k1'}]),
                insert([block('k1', 'foo')], 'after', [
                  ...containerPath(containerKey, nested),
                  {_key: 'k50'},
                ]),
              ],
              doubledCalls: calls,
            })
          } finally {
            fromSpy.mockRestore()
          }
        } finally {
          indexOfSpy.mockRestore()
        }
      })

      test(`times a large keyed list with one block moved first to last ${name}`, () => {
        const keyGenerator = createTestKeyGenerator()
        const containerKey = keyGenerator()
        const shownList = Array.from({length: 6000}, () =>
          block(keyGenerator(), 'foo'),
        )
        const wantedList = [...shownList.slice(1), shownList[0]!]
        const shown = inContainer(shownList, containerKey, nested)
        const wanted = inContainer(wantedList, containerKey, nested)
        const start = performance.now()

        diffValue(shown, wanted)

        console.warn(
          `diffValue, 6000 keyed blocks, one moved first to last ${name}: ${(performance.now() - start).toFixed(1)}ms`,
        )
      })
    }
  })
})

function containerPath(containerKey: string, nested: boolean): Path {
  return nested ? [{_key: containerKey}, 'content'] : []
}

function inContainer(
  list: Array<PortableTextBlock>,
  containerKey: string,
  nested: boolean,
): Array<PortableTextBlock> {
  return nested ? [callout(containerKey, list)] : list
}

function uniqueKeyList(
  random: () => number,
  length: number,
  keyGenerator: () => string,
): Array<PortableTextBlock> {
  const keys = Array.from({length}, () => keyGenerator())

  for (let index = keys.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[keys[index], keys[other]] = [keys[other]!, keys[index]!]
  }

  return keys.map((key) => block(key, 'foo'))
}

function editList(
  list: Array<PortableTextBlock>,
  random: () => number,
  placement: 'first' | 'middle' | 'last',
  kind: number,
  keyGenerator: () => string,
): Array<PortableTextBlock> {
  const pick = (length: number) =>
    placement === 'first'
      ? 0
      : placement === 'last'
        ? length - 1
        : Math.floor(random() * length)
  const edited = [...list]
  const fresh = () => block(keyGenerator(), 'bar')

  if (kind === 0) {
    const [moved] = edited.splice(pick(edited.length), 1)
    edited.splice(pick(edited.length + 1), 0, moved!)
  } else if (kind === 1) {
    const first = pick(edited.length)
    const second = Math.floor(random() * edited.length)
    ;[edited[first], edited[second]] = [edited[second]!, edited[first]!]
  } else if (kind === 2) {
    edited.splice(pick(edited.length), 1)
    edited.splice(pick(edited.length + 1), 0, fresh())
  } else {
    edited.splice(pick(edited.length), 1)
    edited.splice(pick(edited.length + 1), 0, fresh())
    edited.splice(Math.floor(random() * (edited.length + 1)), 0, fresh())
  }

  return edited
}

function referencePatches(
  shown: Array<PortableTextBlock>,
  wanted: Array<PortableTextBlock>,
  path: Path,
): Array<Patch> {
  const itemPath = (key: string): Path => [...path, {_key: key}]
  const shownKeys = shown.map((item) => item._key!)
  const wantedKeys = wanted.map((item) => item._key!)
  const staying = new Set(longestCommonRun(shownKeys, wantedKeys))
  const firstStaying = wantedKeys.find((key) => staying.has(key))

  if (firstStaying === undefined) {
    return [
      ...(wanted.length > 0
        ? [insert(wanted, 'before', itemPath(shownKeys[0]!))]
        : []),
      ...shownKeys.map((key) => unset(itemPath(key))),
    ]
  }

  return [
    ...shownKeys
      .filter((key) => !staying.has(key))
      .map((key) => unset(itemPath(key))),
    ...wanted.flatMap((item, index) => {
      if (staying.has(wantedKeys[index]!)) {
        return []
      }

      const previousKey = wantedKeys[index - 1]

      return previousKey === undefined
        ? [insert([item], 'before', itemPath(firstStaying))]
        : [insert([item], 'after', itemPath(previousKey))]
    }),
  ]
}

function longestCommonRun(
  keysA: Array<string>,
  keysB: Array<string>,
): Array<string> {
  const lengths = Array.from({length: keysA.length + 1}, () =>
    Array.from({length: keysB.length + 1}, () => 0),
  )

  for (let indexA = keysA.length - 1; indexA >= 0; indexA--) {
    for (let indexB = keysB.length - 1; indexB >= 0; indexB--) {
      lengths[indexA]![indexB] =
        keysA[indexA] === keysB[indexB]
          ? lengths[indexA + 1]![indexB + 1]! + 1
          : Math.max(
              lengths[indexA + 1]![indexB]!,
              lengths[indexA]![indexB + 1]!,
            )
    }
  }

  const run: Array<string> = []
  let indexA = 0
  let indexB = 0

  while (indexA < keysA.length && indexB < keysB.length) {
    if (keysA[indexA] === keysB[indexB]) {
      run.push(keysA[indexA]!)
      indexA++
      indexB++
    } else if (lengths[indexA + 1]![indexB]! >= lengths[indexA]![indexB + 1]!) {
      indexA++
    } else {
      indexB++
    }
  }

  return run
}

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

function textBlock(
  key: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [span(spanKey, text)],
  }
}

function table(
  key: string,
  rows: Array<ReturnType<typeof row>>,
): PortableTextBlock {
  return {_type: 'table', _key: key, rows}
}

function row(key: string, cells: Array<ReturnType<typeof cell>>) {
  return {_type: 'row', _key: key, cells}
}

function cell(key: string, content: Array<PortableTextBlock>) {
  return {_type: 'cell', _key: key, content}
}

function callout(
  key: string,
  content: Array<PortableTextBlock>,
): PortableTextBlock {
  return {_type: 'callout', _key: key, tone: 'info', content}
}

function image(
  key: string,
  caption: Array<PortableTextBlock>,
): PortableTextBlock {
  return {
    _type: 'image',
    _key: key,
    asset: {_type: 'reference', _ref: 'image-abc'},
    caption,
  }
}
