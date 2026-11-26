import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import type {Patch} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  isTextBlock,
  type PortableTextBlock,
} from '@portabletext/schema'
import {fromTextspec, createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {interpretChange} from './interpret-change'
import {mapPoint, type Step} from './step-mapper'
function readFixture(scenario: string): {
  seed: string | Array<PortableTextBlock>
  patches: Array<Patch>
} {
  const file =
    scenario === 'span-merge-cosmetic'
      ? `${scenario}.json`
      : `${scenario}@root.json`
  const capture = JSON.parse(
    readFileSync(
      join(import.meta.dirname, '../fixtures/wire-catalogue', file),
      'utf8',
    ),
  )
  return {
    seed:
      scenario === 'block-merge-duplicate-keys'
        ? capture.seedValue
        : capture.seed,
    patches: capture.patches,
  }
}
function seedFromTextspec(
  textspec: string,
  schemaDefinition = defineSchema({}),
): Array<PortableTextBlock> {
  const compiledSchema = compileSchema(schemaDefinition)
  const {blocks} = fromTextspec(
    {schema: compiledSchema, keyGenerator: createTestKeyGenerator()},
    textspec,
  )
  return blocks.map((block) =>
    isTextBlock({schema: compiledSchema}, block)
      ? {style: 'normal', markDefs: [], ...block}
      : block,
  )
}

describe(interpretChange.name, () => {
  test('block-split moves the tail into the new block', () => {
    const fixture = readFixture('block-split')
    const seed = seedFromTextspec(fixture.seed as string)

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 4,
          length: 7,
        },
        to: {
          path: [
            {
              _key: 'k4',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 11,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k4',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 7,
        },
      },
    ] satisfies Array<Step>)
  })

  test('block-split-multi-span moves the split span tail and both flanking spans by key', () => {
    const fixture = readFixture('block-split-multi-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 2,
          length: 2,
        },
        to: {
          path: [
            {
              _key: 'k6',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 4,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k6',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 2,
        },
      },
      {
        type: 'move.node',
        from: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        to: [
          {
            _key: 'k6',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
          offset: 0,
          length: 4,
        },
        to: {
          path: [
            {
              _key: 'k6',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
          offset: 4,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k6',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 2,
        },
      },
    ] satisfies Array<Step>)
  })

  test('block-split-multi-span keeps a caret on the retained head span from being dragged into the reinserted duplicate key', () => {
    const fixture = readFixture('block-split-multi-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const change = interpretChange({value: seed}, fixture.patches)

    for (let offset = 0; offset < 2; offset++) {
      expect(
        mapPoint(change, {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset,
        }),
      ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset})
    }

    expect(
      mapPoint(
        change,
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        {affinity: 'backward'},
      ),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2})
    expect(
      mapPoint(change, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
      }),
    ).toEqual({path: [{_key: 'k6'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('decorator-add-mid-span carves the span in three by moving both flanks', () => {
    const fixture = readFixture('decorator-add-mid-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 7,
          length: 4,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 11,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 4,
          length: 3,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 7,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
          offset: 3,
        },
      },
    ] satisfies Array<Step>)
  })

  test('type-text yields a single insert', () => {
    const fixture = readFixture('type-text')
    const seed = seedFromTextspec(fixture.seed as string)

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'insert.text',
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 11,
        length: 4,
      },
    ] satisfies Array<Step>)
  })

  test('delete-within-span yields a single removal', () => {
    const fixture = readFixture('delete-within-span')
    const seed = seedFromTextspec(fixture.seed as string)

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'remove.text',
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 4,
        length: 3,
      },
    ] satisfies Array<Step>)
  })

  test('span-merge-cosmetic moves the absorbed span and removes its donor', () => {
    const fixture = readFixture('span-merge-cosmetic')
    const seed = fixture.seed as Array<PortableTextBlock>

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        offset: 3,
        length: 1,
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 4,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 4,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 8},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 8},
      },
    ])
  })

  test('block-merge-backspace chains two moves from the deleted block into the surviving span', () => {
    const fixture = readFixture('block-merge-backspace')
    const seed = seedFromTextspec(fixture.seed as string)

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'move.node',
        from: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        to: [{_key: 'k0'}, 'children', {_key: 'k3'}],
      },
      {
        type: 'remove.node',
        path: [{_key: 'k2'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k6'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
      },
    ])
  })

  test('block-merge-duplicate-keys recognizes each renamed, reinserted child as its own move', () => {
    const fixture = readFixture('block-merge-duplicate-keys')
    const seed = fixture.seed as Array<PortableTextBlock>

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'set.key',
        path: [{_key: 'kB'}, 'children', {_key: 's1'}],
        newKey: 'k2',
      },
      {
        type: 'set.key',
        path: [{_key: 'kB'}, 'children', {_key: 's2'}],
        newKey: 'k3',
      },
      {
        type: 'set.key',
        path: [{_key: 'kB'}, 'children', {_key: 's3'}],
        newKey: 'k4',
      },
      {
        type: 'move.node',
        from: [{_key: 'kB'}, 'children', {_key: 'k2'}],
        to: [{_key: 'kA'}, 'children', {_key: 'k2'}],
      },
      {
        type: 'move.node',
        from: [{_key: 'kB'}, 'children', {_key: 'k3'}],
        to: [{_key: 'kA'}, 'children', {_key: 'k3'}],
      },
      {
        type: 'move.node',
        from: [{_key: 'kB'}, 'children', {_key: 'k4'}],
        to: [{_key: 'kA'}, 'children', {_key: 'k4'}],
      },
      {
        type: 'remove.node',
        path: [{_key: 'kB'}],
        nearest: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'kA'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 4,
        },
        to: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'kA'}, 'children', {_key: 'k2'}],
          offset: 4,
          length: 0,
        },
        to: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 8},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'kA'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 4},
      },
      {
        type: 'remove.node',
        path: [{_key: 'kA'}, 'children', {_key: 'k2'}],
        nearest: {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 8},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'kA'}, 'children', {_key: 'k5'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'kA'}, 'children', {_key: 'k4'}], offset: 4},
      },
    ])

    const mapped = mapPoint(change, {
      path: [{_key: 'kB'}, 'children', {_key: 's3'}],
      offset: 3,
    })

    expect(mapped).toEqual({
      path: [{_key: 'kA'}, 'children', {_key: 'k4'}],
      offset: 3,
    })

    for (const untouchedCaret of [
      {path: [{_key: 'kA'}, 'children', {_key: 's1'}], offset: 2},
      {path: [{_key: 'kA'}, 'children', {_key: 's2'}], offset: 1},
      {path: [{_key: 'kA'}, 'children', {_key: 's3'}], offset: 2},
    ]) {
      expect(mapPoint(change, untouchedCaret)).toEqual(untouchedCaret)
    }
  })

  test('annotation-add-mid-span carves the span in three by moving both flanks', () => {
    const fixture = readFixture('annotation-add-mid-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    )

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 7,
          length: 4,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 11,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 4,
          length: 3,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k6',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 7,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k6',
            },
          ],
          offset: 3,
        },
      },
    ] satisfies Array<Step>)
  })

  test('annotation-remove chains two moves back into the surviving span', () => {
    const fixture = readFixture('annotation-remove')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    )

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
          offset: 0,
          length: 4,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
          offset: 4,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 11},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 11},
      },
    ])
  })

  test('block-move recognizes the reinserted block as a moved node, not a removal', () => {
    const fixture = readFixture('block-move')
    const seed = seedFromTextspec(fixture.seed as string)

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([] satisfies Array<Step>)
  })

  test('decorator-remove-sub-range carves the span in three by moving both flanks', () => {
    const fixture = readFixture('decorator-remove-sub-range')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 7,
          length: 4,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 11,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 4,
          length: 3,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 7,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
          offset: 3,
        },
      },
    ] satisfies Array<Step>)
  })

  test('decorator-remove-whole-span chains two moves back into the surviving span', () => {
    const fixture = readFixture('decorator-remove-whole-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 3,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 3,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 4},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 4,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 4,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 11},
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 0,
        },
        to: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 7},
      },
      {
        type: 'remove.node',
        path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        nearest: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 11},
      },
    ])
  })

  test('insert-blocks-auto folds the scratch span into the target and leaves the pasted block alone', () => {
    const fixture = readFixture('insert-blocks-auto')
    const seed = seedFromTextspec(fixture.seed as string)

    const change = interpretChange({value: seed}, fixture.patches)

    expect(change).toEqual([
      {
        type: 'insert.text',
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 3,
        length: 3,
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k8',
            },
          ],
          offset: 0,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 6,
        },
      },
      {
        type: 'move.text',
        from: {
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
          offset: 6,
          length: 0,
        },
        to: {
          path: [
            {
              _key: 'k6',
            },
            'children',
            {
              _key: 'k7',
            },
          ],
          offset: 3,
        },
      },
    ] satisfies Array<Step>)
  })
})
