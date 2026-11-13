import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import type {JSONValue, Patch, Path} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  isTextBlock,
  type PortableTextBlock,
} from '@portabletext/schema'
import {fromTextspec, createTestKeyGenerator} from '@portabletext/test'
import {makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test} from 'vitest'
import {interpretTransaction} from './interpret-transaction'
import {resolvePath} from './lib/document'
import {isKeyedSegment} from './lib/is-keyed-segment'
import {mapRangeInward} from './map-range-inward'
import {rangeSurvives} from './range-survives'
import {mapPoint, mapRange, type Step, type StepPath} from './step-mapper'

const wireCatalogueDir = join(
  __dirname,
  '../../editor/tests/__fixtures__/wire-catalogue',
)

function readFixture(scenario: string): {
  seed: string | Array<PortableTextBlock>
  patches: Array<Patch>
} {
  return JSON.parse(
    readFileSync(join(wireCatalogueDir, `${scenario}.json`), 'utf-8'),
  ) as {
    seed: string | Array<PortableTextBlock>
    patches: Array<Patch>
  }
}

/**
 * Parse a textspec seed the same way the wire catalogue captured it: a
 * fresh key generator, canonicalized to carry `style`/`markDefs` so the
 * seed matches what the recorded patches were derived against.
 */
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

describe(interpretTransaction.name, () => {
  test('a numeric block path after a root insertion does not mutate the base value', () => {
    const keyGenerator = createTestKeyGenerator()
    const firstBlockKey = keyGenerator()
    const firstSpanKey = keyGenerator()
    const secondBlockKey = keyGenerator()
    const secondSpanKey = keyGenerator()
    const thirdBlockKey = keyGenerator()
    const thirdSpanKey = keyGenerator()
    const insertedBlockKey = keyGenerator()
    const insertedSpanKey = keyGenerator()
    const base = [
      makeBlock(firstBlockKey, firstSpanKey, 'foo'),
      makeBlock(secondBlockKey, secondSpanKey, 'bar'),
      makeBlock(thirdBlockKey, thirdSpanKey, 'baz'),
    ]
    const originalBase = structuredClone(base)

    interpretTransaction(base, [
      {
        type: 'insert',
        path: [{_key: firstBlockKey}],
        position: 'before',
        items: [makeBlock(insertedBlockKey, insertedSpanKey, 'foo')],
      },
      {
        type: 'set',
        path: [2, 'children', {_key: secondSpanKey}, 'text'],
        value: 'changed',
      },
    ])

    expect(base).toEqual(originalBase)
  })

  test('a numeric block path created by an earlier insertion resolves against the working value', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const insertedBlockKey = keyGenerator()
    const insertedSpanKey = keyGenerator()
    const base = [makeBlock(blockKey, spanKey, 'foo')]

    const steps = interpretTransaction(base, [
      {
        type: 'insert',
        path: [0],
        position: 'after',
        items: [makeBlock(insertedBlockKey, insertedSpanKey, 'bar')],
      },
      {
        type: 'set',
        path: [1, 'children', {_key: insertedSpanKey}, 'text'],
        value: 'baz',
      },
    ])

    expect(steps).toEqual([
      {
        type: 'set.text',
        path: [{_key: insertedBlockKey}, 'children', {_key: insertedSpanKey}],
        length: 3,
      },
    ])
  })

  test('Scenario: block-split moves the tail into the new block', () => {
    const fixture = readFixture('block-split')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
          length: 7,
        },
        to: {
          path: [{_key: 'k4'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 11,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
        to: {
          offset: 7,
          path: [
            {
              _key: 'k4',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
    ] satisfies Array<Step>)
  })

  test('Scenario: block-split-multi-span moves the split span tail and both flanking spans by key', () => {
    const fixture = readFixture('block-split-multi-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const steps = interpretTransaction(seed, fixture.patches)

    // The split span's tail reappears under its own key in the new block
    // while the head keeps that key, trimmed in place: it pairs as a text
    // move, like the single-span split.
    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 2,
          length: 2,
        },
        to: {path: [{_key: 'k6'}, 'children', {_key: 'k1'}], offset: 0},
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 4,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
        to: {
          offset: 2,
          path: [
            {
              _key: 'k6',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
      {
        type: 'move.node',
        from: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        to: [{_key: 'k6'}, 'children', {_key: 'k2'}],
      },
      {
        type: 'move.node',
        from: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        to: [{_key: 'k6'}, 'children', {_key: 'k3'}],
      },
    ] satisfies Array<Step>)
  })

  test('Scenario: block-split-multi-span keeps a caret on the retained head span from being dragged into the reinserted duplicate key', () => {
    const fixture = readFixture('block-split-multi-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const steps = interpretTransaction(seed, fixture.patches)

    for (let offset = 0; offset < 2; offset++) {
      expect(
        mapPoint(steps, {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset,
        }),
      ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset})
    }
    // At the split offset the caret sits on the boundary of the moved
    // tail, as in the single-span split: backward affinity keeps it on the
    // head, forward affinity follows the tail.
    expect(
      mapPoint(
        steps,
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
        {affinity: 'backward'},
      ),
    ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2})
    expect(
      mapPoint(steps, {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
      }),
    ).toEqual({path: [{_key: 'k6'}, 'children', {_key: 'k1'}], offset: 0})
  })

  test('Scenario: decorator-add-mid-span carves the span in three by moving both flanks', () => {
    const fixture = readFixture('decorator-add-mid-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 7,
          length: 4,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 11,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
        to: {
          offset: 4,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
        },
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k5'}],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 7,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
        to: {
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
        },
      },
    ] satisfies Array<Step>)
  })

  test('Scenario: type-text yields a single insert', () => {
    const fixture = readFixture('type-text')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 11,
        length: 4,
      },
    ] satisfies Array<Step>)
  })

  test('Scenario: delete-within-span yields a single removal', () => {
    const fixture = readFixture('delete-within-span')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 4,
        length: 3,
      },
    ] satisfies Array<Step>)
  })

  test('Scenario: span-merge-cosmetic folds the absorbed span in as one move, current text and all', () => {
    // The fixture's own seed carries two spans with identical (empty)
    // marks: textspec has no notation for a span boundary that isn't a
    // mark boundary (see `packages/editor/tests/wire-catalogue.test.tsx`),
    // so this fixture is read as full blocks rather than through
    // `seedFromTextspec`.
    const fixture = readFixture('span-merge-cosmetic')
    const seed = fixture.seed as Array<PortableTextBlock>

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
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
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 4,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
        },
        to: {
          offset: 8,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k2'}]},
    ] satisfies Array<Step>)
  })

  test('Scenario: block-merge-backspace chains two moves from the deleted block into the surviving span', () => {
    const fixture = readFixture('block-merge-backspace')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 3,
          path: [
            {
              _key: 'k2',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
        },
        to: {
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'k2'}]},
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
        },
        to: {
          offset: 6,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k3'}]},
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k6'}]},
    ] satisfies Array<Step>)
  })

  test('Scenario: block-merge-duplicate-keys recognizes each renamed, reinserted child as its own move', () => {
    // Unlike block-merge-backspace, kept as full blocks (not a textspec
    // seed): a duplicate `_key` across two blocks has no textspec notation.
    const fixture = readFixture('block-merge-duplicate-keys')
    const seed = fixture.seed as Array<PortableTextBlock>

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
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
      {type: 'remove.node', path: [{_key: 'kB'}]},
      {
        type: 'move.text',
        from: {
          path: [{_key: 'kA'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 4,
        },
        to: {
          path: [{_key: 'kA'}, 'children', {_key: 's3'}],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 4,
          path: [
            {
              _key: 'kA',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
        },
        to: {
          offset: 8,
          path: [
            {
              _key: 'kA',
            },
            'children',
            {
              _key: 's3',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'kA'}, 'children', {_key: 'k2'}]},
      {type: 'remove.node', path: [{_key: 'kA'}, 'children', {_key: 'k5'}]},
    ] satisfies Array<Step>)

    const mapped = mapPoint(steps, {
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
      expect(mapPoint(steps, untouchedCaret)).toEqual(untouchedCaret)
    }
  })

  test('Scenario: annotation-add-mid-span carves the span in three by moving both flanks', () => {
    const fixture = readFixture('annotation-add-mid-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    )

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 7,
          length: 4,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k5'}],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 11,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
        to: {
          offset: 4,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
        },
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k6'}],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 7,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
        to: {
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k6',
            },
          ],
        },
      },
    ] satisfies Array<Step>)
  })

  test('Scenario: annotation-remove chains two moves back into the surviving span', () => {
    const fixture = readFixture('annotation-remove')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
    )

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
        },
        to: {
          offset: 7,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k3'}]},
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
          offset: 0,
          length: 4,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 7,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 4,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
        },
        to: {
          offset: 11,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k4'}]},
    ] satisfies Array<Step>)
  })

  test('Scenario: block-move recognizes the reinserted block as a moved node, not a removal', () => {
    const fixture = readFixture('block-move')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {type: 'move.node', from: [{_key: 'k0'}], to: [{_key: 'k0'}]},
    ] satisfies Array<Step>)
  })

  test('Scenario: decorator-remove-sub-range carves the span in three by moving both flanks', () => {
    const fixture = readFixture('decorator-remove-sub-range')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 7,
          length: 4,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 11,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
        to: {
          offset: 4,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k4',
            },
          ],
        },
      },
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k5'}],
          offset: 0,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 7,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
        to: {
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
        },
      },
    ] satisfies Array<Step>)
  })

  test('Scenario: decorator-remove-whole-span chains two moves back into the surviving span', () => {
    const fixture = readFixture('decorator-remove-whole-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k2',
            },
          ],
        },
        to: {
          offset: 7,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k2'}]},
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k3'}],
          offset: 0,
          length: 4,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 7,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 4,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k3',
            },
          ],
        },
        to: {
          offset: 11,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k3'}]},
    ] satisfies Array<Step>)
  })

  test('Scenario: insert-blocks-auto folds the scratch span into the target and leaves the pasted block alone', () => {
    const fixture = readFixture('insert-blocks-auto')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {
          path: [{_key: 'k0'}, 'children', {_key: 'k5'}],
          offset: 0,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 3,
        },
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 3,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k5',
            },
          ],
        },
        to: {
          offset: 6,
          path: [
            {
              _key: 'k0',
            },
            'children',
            {
              _key: 'k1',
            },
          ],
        },
      },
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k5'}]},
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k8'}]},
    ] satisfies Array<Step>)
  })
})

function spanPath(blockKey: string, spanKey: string): StepPath {
  return [{_key: blockKey}, 'children', {_key: spanKey}]
}

function makeBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
  } satisfies PortableTextBlock
}

describe('interpretTransaction oracle: character-identity across synthetic transactions', () => {
  // Distinct characters (not foo/bar/baz) so every position in the seed is
  // individually identifiable after the transaction reshuffles it: the
  // oracle checks that a mapped point sits between the same two characters
  // it did before, and that check is only unambiguous when no character
  // repeats.
  const seedText = 'abcdefghijkl'

  function concatenatedSpanText(blocks: Array<PortableTextBlock>): string {
    let text = ''
    for (const block of blocks) {
      if (!isTextBlock({schema: compileSchema(defineSchema({}))}, block)) {
        continue
      }
      for (const child of block.children) {
        if (typeof (child as {text?: unknown}).text === 'string') {
          text += (child as {text: string}).text
        }
      }
    }
    return text
  }

  function globalOffsetOf(
    blocks: Array<PortableTextBlock>,
    path: Path,
    offset: number,
  ): number | undefined {
    const blockSegment = path[0]
    const spanSegment = path[2]
    if (!isKeyedSegment(blockSegment) || !isKeyedSegment(spanSegment)) {
      return undefined
    }

    let runningOffset = 0
    for (const block of blocks) {
      if (!isTextBlock({schema: compileSchema(defineSchema({}))}, block)) {
        continue
      }
      for (const child of block.children) {
        const childText = (child as {text?: unknown}).text
        if (typeof childText !== 'string') {
          continue
        }
        const isTargetSpan =
          blockSegment._key === block._key &&
          spanSegment._key === (child as {_key: string})._key
        if (isTargetSpan) {
          return runningOffset + offset
        }
        runningOffset += childText.length
      }
    }
    return undefined
  }

  function assertCharacterIdentityPreserved(
    resultBlocks: Array<PortableTextBlock>,
    steps: Array<Step>,
    caretPath: StepPath,
    caretOffset: number,
  ) {
    expect(concatenatedSpanText(resultBlocks)).toBe(seedText)

    const mapped = mapPoint(steps, {
      path: caretPath,
      offset: caretOffset,
    })

    expect(mapped).not.toBeNull()

    const actualOffset = globalOffsetOf(
      resultBlocks,
      mapped!.path,
      mapped!.offset,
    )
    expect(typeof actualOffset).toBe('number')

    const expectedLeft = caretOffset > 0 ? seedText[caretOffset - 1] : null
    const expectedRight =
      caretOffset < seedText.length ? seedText[caretOffset] : null
    const actualLeft = actualOffset! > 0 ? seedText[actualOffset! - 1] : null
    const actualRight =
      actualOffset! < seedText.length ? seedText[actualOffset!] : null

    expect(actualLeft).toBe(expectedLeft)
    expect(actualRight).toBe(expectedRight)
  }

  test('every split offset preserves character identity for every caret position', () => {
    let cases = 0

    // A 1-character tail pairs too: the new block reuses the span key, so
    // the sweep runs up to the last character. An empty tail has nothing to
    // move and is left out.
    for (
      let splitOffset = 0;
      splitOffset <= seedText.length - 1;
      splitOffset++
    ) {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const newBlockKey = keyGenerator()

      const seed = [makeBlock(blockKey, spanKey, seedText)]

      const keptText = seedText.slice(0, splitOffset)
      const tailText = seedText.slice(splitOffset)

      const patches: Array<Patch> = [
        {
          type: 'diffMatchPatch',
          path: [...spanPath(blockKey, spanKey), 'text'],
          value: dmpPatch(seedText, keptText),
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: blockKey}],
          position: 'after',
          items: [makeBlock(newBlockKey, spanKey, tailText)],
          origin: 'local',
        },
      ]

      const steps = interpretTransaction(seed, patches)
      const resultBlocks = [
        makeBlock(blockKey, spanKey, keptText),
        makeBlock(newBlockKey, spanKey, tailText),
      ]

      for (let caretOffset = 0; caretOffset <= seedText.length; caretOffset++) {
        assertCharacterIdentityPreserved(
          resultBlocks,
          steps,
          spanPath(blockKey, spanKey),
          caretOffset,
        )
        cases++
      }
    }

    // Exhaustive over the small space, so the run is deterministic
    // without a seeded RNG.
    expect(cases).toBe(156)
  })

  test('every decorator-add range preserves character identity for every caret position', () => {
    let cases = 0

    // A moved range shorter than two characters never pairs (same rule as
    // above), whether it's the decorated mid range or the trailing
    // remainder, so both are excluded from this sweep.
    for (let start = 0; start < seedText.length; start++) {
      for (let end = start + 1; end <= seedText.length; end++) {
        const midLength = end - start
        const tailLength = seedText.length - end
        if (midLength < 2 || (tailLength > 0 && tailLength < 2)) {
          continue
        }

        const keyGenerator = createTestKeyGenerator()
        const blockKey = keyGenerator()
        const spanKey = keyGenerator()
        const tailSpanKey = keyGenerator()
        const midSpanKey = keyGenerator()

        const seed = [makeBlock(blockKey, spanKey, seedText)]

        const prefixText = seedText.slice(0, start)
        const midText = seedText.slice(start, end)
        const tailText = seedText.slice(end)

        const patches: Array<Patch> = []
        let afterTailRemovalText = seedText

        if (tailText.length > 0) {
          afterTailRemovalText = seedText.slice(0, end)
          patches.push(
            {
              type: 'diffMatchPatch',
              path: [...spanPath(blockKey, spanKey), 'text'],
              value: dmpPatch(seedText, afterTailRemovalText),
              origin: 'local',
            },
            {
              type: 'setIfMissing',
              path: [{_key: blockKey}, 'children'],
              value: [],
              origin: 'local',
            },
            {
              type: 'insert',
              path: spanPath(blockKey, spanKey),
              position: 'after',
              items: [
                {_type: 'span', _key: tailSpanKey, text: tailText, marks: []},
              ],
              origin: 'local',
            },
          )
        }

        patches.push(
          {
            type: 'diffMatchPatch',
            path: [...spanPath(blockKey, spanKey), 'text'],
            value: dmpPatch(afterTailRemovalText, prefixText),
            origin: 'local',
          },
          {
            type: 'setIfMissing',
            path: [{_key: blockKey}, 'children'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: spanPath(blockKey, spanKey),
            position: 'after',
            items: [
              {_type: 'span', _key: midSpanKey, text: midText, marks: []},
            ],
            origin: 'local',
          },
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: midSpanKey}, 'marks'],
            value: ['strong'],
            origin: 'local',
          },
        )

        const steps = interpretTransaction(seed, patches)

        const resultChildren = [
          {_type: 'span', _key: spanKey, text: prefixText, marks: []},
          {_type: 'span', _key: midSpanKey, text: midText, marks: ['strong']},
          ...(tailText.length > 0
            ? [{_type: 'span', _key: tailSpanKey, text: tailText, marks: []}]
            : []),
        ]
        const resultBlocks = [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            markDefs: [],
            children: resultChildren,
          } as PortableTextBlock,
        ]

        for (
          let caretOffset = 0;
          caretOffset <= seedText.length;
          caretOffset++
        ) {
          assertCharacterIdentityPreserved(
            resultBlocks,
            steps,
            spanPath(blockKey, spanKey),
            caretOffset,
          )
          cases++
        }
      }
    }

    // Exhaustive over the small space, so the run is deterministic
    // without a seeded RNG.
    expect(cases).toBe(728)
  })
})

describe('interpretTransaction oracle: multi-span block splits (key-reappearance)', () => {
  type SpanSpec = {key: string; text: string; marks: Array<string>}

  function concatenatedSpanText(blocks: Array<PortableTextBlock>): string {
    let text = ''
    for (const block of blocks) {
      if (!isTextBlock({schema: compileSchema(defineSchema({}))}, block)) {
        continue
      }
      for (const child of block.children) {
        if (typeof (child as {text?: unknown}).text === 'string') {
          text += (child as {text: string}).text
        }
      }
    }
    return text
  }

  function globalOffsetOf(
    blocks: Array<PortableTextBlock>,
    path: Path,
    offset: number,
  ): number | undefined {
    const blockSegment = path[0]
    const spanSegment = path[2]
    if (!isKeyedSegment(blockSegment) || !isKeyedSegment(spanSegment)) {
      return undefined
    }

    let runningOffset = 0
    for (const block of blocks) {
      if (!isTextBlock({schema: compileSchema(defineSchema({}))}, block)) {
        continue
      }
      for (const child of block.children) {
        const childText = (child as {text?: unknown}).text
        if (typeof childText !== 'string') {
          continue
        }
        const isTargetSpan =
          blockSegment._key === block._key &&
          spanSegment._key === (child as {_key: string})._key
        if (isTargetSpan) {
          return runningOffset + offset
        }
        runningOffset += childText.length
      }
    }
    return undefined
  }

  function assertCharacterIdentityPreserved(
    seedText: string,
    resultBlocks: Array<PortableTextBlock>,
    steps: Array<Step>,
    caretPath: StepPath,
    caretOffset: number,
    globalCaretOffset: number,
  ) {
    expect(concatenatedSpanText(resultBlocks)).toBe(seedText)

    const mapped = mapPoint(steps, {
      path: caretPath,
      offset: caretOffset,
    })

    expect(mapped).not.toBeNull()

    const actualOffset = globalOffsetOf(
      resultBlocks,
      mapped!.path,
      mapped!.offset,
    )
    expect(typeof actualOffset).toBe('number')

    const expectedLeft =
      globalCaretOffset > 0 ? seedText[globalCaretOffset - 1] : null
    const expectedRight =
      globalCaretOffset < seedText.length ? seedText[globalCaretOffset] : null
    const actualLeft = actualOffset! > 0 ? seedText[actualOffset! - 1] : null
    const actualRight =
      actualOffset! < seedText.length ? seedText[actualOffset!] : null

    expect(actualLeft).toBe(expectedLeft)
    expect(actualRight).toBe(expectedRight)
  }

  /**
   * Build the patches a real multi-span block split emits (see the
   * `block-split-multi-span` wire capture): the split span is trimmed to
   * its head portion in place, and every span after it (its own tail
   * remainder included) reappears, key intact, as a child of a new tail
   * block. Every span strictly after the split span is emptied by a
   * `diffMatchPatch` and then unset, mirroring the capture's trickiest
   * shape (the one `move.node`'s step-supersession exists for) rather than
   * the simpler clean-unset shape a middle span can also take.
   */
  function buildMultiSpanSplit(
    blockKey: string,
    spans: ReadonlyArray<SpanSpec>,
    splitSpanIndex: number,
    localOffset: number,
    newBlockKey: string,
  ): {patches: Array<Patch>; resultBlocks: Array<PortableTextBlock>} {
    const splitSpan = spans[splitSpanIndex]!
    const trailingSpans = spans.slice(splitSpanIndex + 1)
    const headRemainderText = splitSpan.text.slice(0, localOffset)
    const tailRemainderText = splitSpan.text.slice(localOffset)

    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [...spanPath(blockKey, splitSpan.key), 'text'],
        value: dmpPatch(splitSpan.text, headRemainderText),
        origin: 'local',
      },
    ]

    for (const span of trailingSpans) {
      patches.push({
        type: 'diffMatchPatch',
        path: [...spanPath(blockKey, span.key), 'text'],
        value: dmpPatch(span.text, ''),
        origin: 'local',
      })
    }

    const tailChildren = [
      {
        _type: 'span',
        _key: splitSpan.key,
        text: tailRemainderText,
        marks: splitSpan.marks,
      },
      ...trailingSpans.map((span) => ({
        _type: 'span',
        _key: span.key,
        text: span.text,
        marks: span.marks,
      })),
    ]

    patches.push({
      type: 'insert',
      path: [{_key: blockKey}],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: newBlockKey,
          children: tailChildren,
          markDefs: [],
          style: 'normal',
        },
      ],
      origin: 'local',
    })

    for (const span of trailingSpans) {
      patches.push({
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: span.key}],
        origin: 'local',
      })
    }

    const headChildren = [
      ...spans.slice(0, splitSpanIndex).map((span) => ({
        _type: 'span',
        _key: span.key,
        text: span.text,
        marks: span.marks,
      })),
      {
        _type: 'span',
        _key: splitSpan.key,
        text: headRemainderText,
        marks: splitSpan.marks,
      },
    ]

    const resultBlocks: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal',
        markDefs: [],
        children: headChildren,
      } as PortableTextBlock,
      {
        _type: 'block',
        _key: newBlockKey,
        style: 'normal',
        markDefs: [],
        children: tailChildren,
      } as PortableTextBlock,
    ]

    return {patches, resultBlocks}
  }

  test('every split offset across every span, with carets at every position, preserves character identity', () => {
    let cases = 0

    // Two span layouts (2 and 3 spans) over the same 12-character alphabet
    // as the single-span oracle, with a marked span in the middle of each:
    // enough to exercise both an odd and an even span count while keeping
    // the sweep small enough to stay exhaustive rather than sampled.
    const layouts: Array<Array<{text: string; marks: Array<string>}>> = [
      [
        {text: 'abcdef', marks: []},
        {text: 'ghijkl', marks: ['strong']},
      ],
      [
        {text: 'abcd', marks: []},
        {text: 'efgh', marks: ['strong']},
        {text: 'ijkl', marks: []},
      ],
    ]

    for (const layout of layouts) {
      const seedText = layout.map((span) => span.text).join('')

      // The split span must leave at least one whole span after it for the
      // multi-span shape (a lone trailing remainder is the single-span
      // `block-split` shape, already covered by its own oracle), and the
      // split itself must land strictly inside the split span (offset 0
      // would leave it wholly in the tail with nothing to carve, a shape
      // this synthetic builder doesn't model since it always dmp-trims the
      // split span in place).
      for (
        let splitSpanIndex = 0;
        splitSpanIndex < layout.length - 1;
        splitSpanIndex++
      ) {
        const splitSpanText = layout[splitSpanIndex]!.text

        for (
          let localOffset = 1;
          localOffset <= splitSpanText.length;
          localOffset++
        ) {
          const keyGenerator = createTestKeyGenerator()
          const blockKey = keyGenerator()
          const spans: Array<SpanSpec> = layout.map((span) => ({
            key: keyGenerator(),
            text: span.text,
            marks: span.marks,
          }))
          const newBlockKey = keyGenerator()

          const seed = [
            {
              _type: 'block',
              _key: blockKey,
              style: 'normal',
              markDefs: [],
              children: spans.map((span) => ({
                _type: 'span',
                _key: span.key,
                text: span.text,
                marks: span.marks,
              })),
            } as PortableTextBlock,
          ]

          const {patches, resultBlocks} = buildMultiSpanSplit(
            blockKey,
            spans,
            splitSpanIndex,
            localOffset,
            newBlockKey,
          )

          const steps = interpretTransaction(seed, patches)

          // Carets at every offset of every original span, not just the
          // split span: spans strictly before it never move and are
          // trivially exact; spans at or after it are asserted for full
          // character identity. Each span's offset is local to that span,
          // so it's converted to its global position in `seedText` before
          // comparing: only the first span in a layout has local and
          // global offsets coincide.
          for (const span of spans) {
            for (
              let caretOffset = 0;
              caretOffset <= span.text.length;
              caretOffset++
            ) {
              const globalCaretOffset = globalOffsetOf(
                seed,
                spanPath(blockKey, span.key),
                caretOffset,
              )!

              // The split span's key reappears in the tail while the head
              // keeps it, trimmed in place. The tail is offered as its own
              // move candidate, so carets in it keep character identity
              // like every other span (they used to degrade to the split
              // boundary).
              assertCharacterIdentityPreserved(
                seedText,
                resultBlocks,
                steps,
                spanPath(blockKey, span.key),
                caretOffset,
                globalCaretOffset,
              )
              cases++
            }
          }
        }
      }
    }

    // Exhaustive over the small space, so the run is deterministic
    // without a seeded RNG.
    expect(cases).toBe(204)
  })
})

describe('interpretTransaction: adversarial recognizer misfires', () => {
  test('a rename never lends its lineage to an unrelated node with the same key', () => {
    const kP = 'kP'
    const s1 = 's1'
    const kQ = 'kQ'
    const collidingKey = 'X'
    const kR = 'kR'
    const r1 = 'r1'
    const seed = [
      makeBlock(kP, s1, 'def'),
      makeBlock(kQ, collidingKey, 'abc'),
      makeBlock(kR, r1, 'zzz'),
    ]

    const patches: Array<Patch> = [
      // Renames kP's own span to a key that happens to equal kQ's
      // pre-existing, wholly unrelated span key.
      {
        type: 'set',
        path: [{_key: kP}, 'children', {_key: s1}, '_key'],
        value: collidingKey,
        origin: 'local',
      },
      // Unrelated: kQ (holding its own, pre-existing 'X') is removed as a
      // whole, nothing to do with kP's rename.
      {type: 'unset', path: [{_key: kQ}], origin: 'local'},
      // Unrelated: a brand-new span, coincidentally also keyed 'X',
      // appears under kR.
      {
        type: 'insert',
        path: [{_key: kR}, 'children', {_key: r1}],
        position: 'after',
        items: [{_type: 'span', _key: collidingKey, text: 'qqq', marks: []}],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {
        type: 'set.key',
        path: [{_key: kP}, 'children', {_key: s1}],
        newKey: collidingKey,
      },
      {type: 'remove.node', path: [{_key: kQ}]},
    ] satisfies Array<Step>)

    const mapped = mapPoint(steps, {
      path: spanPath(kQ, collidingKey),
      offset: 1,
    })

    expect(mapped).toBeNull()
  })

  test('a merge with a partial key collision moves every uniquely keyed descendant before its container removal', () => {
    const kA = 'kA'
    const kB = 'kB'
    const collidingKey = 's1'
    const renamedKey = 'k2'
    const untouchedSibling = 's9'
    const seed = [
      makeBlock(kA, collidingKey, 'foo '),
      {
        _type: 'block',
        _key: kB,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: collidingKey, text: 'bar', marks: []},
          {_type: 'span', _key: untouchedSibling, text: 'baz', marks: []},
        ],
      } satisfies PortableTextBlock,
    ]

    const patches: Array<Patch> = [
      // Only `s1` collides with kA's own child, so only it is renamed;
      // `s9` has no collision and keeps its key across the merge.
      {
        type: 'set',
        path: [{_key: kB}, 'children', {_key: collidingKey}, '_key'],
        value: renamedKey,
        origin: 'local',
      },
      {type: 'unset', path: [{_key: kB}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: kA}, 'children', {_key: collidingKey}],
        position: 'after',
        items: [{_type: 'span', _key: renamedKey, text: 'bar', marks: []}],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: kA}, 'children', {_key: renamedKey}],
        position: 'after',
        items: [
          {_type: 'span', _key: untouchedSibling, text: 'baz', marks: []},
        ],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {
        type: 'set.key',
        path: [{_key: kB}, 'children', {_key: collidingKey}],
        newKey: renamedKey,
      },
      {
        type: 'move.node',
        from: spanPath(kB, renamedKey),
        to: spanPath(kA, renamedKey),
      },
      {
        type: 'move.node',
        from: spanPath(kB, untouchedSibling),
        to: spanPath(kA, untouchedSibling),
      },
      {type: 'remove.node', path: [{_key: kB}]},
    ] satisfies Array<Step>)

    const mapped = mapPoint(steps, {
      path: spanPath(kB, untouchedSibling),
      offset: 2,
    })

    expect(mapped).toEqual({
      path: spanPath(kA, untouchedSibling),
      offset: 2,
    })
  })

  test('an unrelated identical delete and insert in different blocks never pairs', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b2 = 'b2'
    const s2 = 's2'
    const seed = [
      makeBlock(b1, s1, 'hello cat world'),
      makeBlock(b2, s2, 'goodbye '),
    ]

    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b1, s1), 'text'],
        value: dmpPatch('hello cat world', 'hello  world'),
        origin: 'local',
      },
      // Unrelated: someone types "cat" into block 2's existing span.
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b2, s2), 'text'],
        value: dmpPatch('goodbye ', 'goodbye cat'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.text', path: spanPath(b1, s1), offset: 6, length: 3},
      {type: 'insert.text', path: spanPath(b2, s2), offset: 8, length: 3},
    ] satisfies Array<Step>)
  })

  test('a block split with a 1-character tail moves the tail into the new block', () => {
    const seed = [makeBlock('b1', 's1', 'foo charlie')]

    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [...spanPath('b1', 's1'), 'text'],
        value: dmpPatch('foo charlie', 'foo charli'),
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: 'b1'}],
        position: 'after',
        items: [makeBlock('b2', 's1', 'e')],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {
        type: 'move.text',
        from: {path: spanPath('b1', 's1'), offset: 10, length: 1},
        to: {path: spanPath('b2', 's1'), offset: 0},
      },
      {
        type: 'move.text',
        from: {
          length: 0,
          offset: 11,
          path: [
            {
              _key: 'b1',
            },
            'children',
            {
              _key: 's1',
            },
          ],
        },
        to: {
          offset: 1,
          path: [
            {
              _key: 'b2',
            },
            'children',
            {
              _key: 's1',
            },
          ],
        },
      },
    ] satisfies Array<Step>)
    // A range over "charlie" ending at the block end follows its last
    // character into the new block instead of losing it.
    expect(
      mapRange(steps, {
        anchor: {path: spanPath('b1', 's1'), offset: 4},
        focus: {path: spanPath('b1', 's1'), offset: 11},
      }),
    ).toEqual({
      anchor: {path: spanPath('b1', 's1'), offset: 4},
      focus: {path: spanPath('b2', 's1'), offset: 1},
    })
  })

  test('a block merge of a 1-character block folds it into the previous span', () => {
    const seed = [makeBlock('b1', 's1', 'foo'), makeBlock('b2', 's2', 'x')]
    const children = [{_key: 'b1'}, 'children'] as Path

    const patches: Array<Patch> = [
      {type: 'unset', path: [{_key: 'b2'}], origin: 'local'},
      {type: 'setIfMissing', path: children, value: [], origin: 'local'},
      {
        type: 'insert',
        path: [...children, {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 's2', text: 'x', marks: []}],
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [...spanPath('b1', 's1'), 'text'],
        value: dmpPatch('foo', 'foox'),
        origin: 'local',
      },
      {type: 'unset', path: [...children, {_key: 's2'}], origin: 'local'},
    ]

    const steps = interpretTransaction(seed, patches)

    // A range over "x" follows it into the merged block.
    expect(
      mapRange(steps, {
        anchor: {path: spanPath('b2', 's2'), offset: 0},
        focus: {path: spanPath('b2', 's2'), offset: 1},
      }),
    ).toEqual({
      anchor: {path: spanPath('b1', 's1'), offset: 3},
      focus: {path: spanPath('b1', 's1'), offset: 4},
    })
  })

  test('a one-character delete never pairs, even with matching typing elsewhere', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b2 = 'b2'
    const s2 = 's2'
    const seed = [makeBlock(b1, s1, 'cats')]

    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b1, s1), 'text'],
        value: dmpPatch('cats', 'cat'),
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: b1}],
        position: 'after',
        items: [makeBlock(b2, s2, 's')],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.text', path: spanPath(b1, s1), offset: 3, length: 1},
    ] satisfies Array<Step>)
  })

  test('a node insertion preceding its matching removal never pairs', () => {
    const b0 = 'b0'
    const s0 = 's0'
    const b1 = 'b1'
    const s1 = 's1'
    const seed = [makeBlock(b0, s0, 'wxyz')]

    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: b0}],
        position: 'before',
        items: [makeBlock(b1, s1, 'wxy')],
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b0, s0), 'text'],
        value: dmpPatch('wxyz', 'z'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.text', path: spanPath(b0, s0), offset: 0, length: 3},
    ] satisfies Array<Step>)
  })

  test('two identical surviving insert-first candidates do not pair with one removal', () => {
    const seed = [makeBlock('b0', 's0', 'wxyz')]
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b0'}],
        position: 'before',
        items: [makeBlock('b1', 's1', 'wxy')],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: 'b0'}],
        position: 'after',
        items: [makeBlock('b2', 's2', 'wxy')],
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [...spanPath('b0', 's0'), 'text'],
        value: dmpPatch('wxyz', 'z'),
        origin: 'local',
      },
    ]

    expect(interpretTransaction(seed, patches)).toEqual([
      {
        type: 'remove.text',
        path: spanPath('b0', 's0'),
        offset: 0,
        length: 3,
      },
    ] satisfies Array<Step>)
  })

  test('a surviving descendant with the same key moves before its removed container', () => {
    const seed = [
      makeBlock('b1', 's1', 'foo'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'bar ', marks: []},
          {_type: 'span', _key: 's3', text: 'baz', marks: []},
        ],
      } satisfies PortableTextBlock,
    ]
    const patches: Array<Patch> = [
      {type: 'unset', path: [{_key: 'b2'}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [
          {_type: 'span', _key: 's2', text: 'bar ', marks: []},
          {_type: 'span', _key: 's3', text: 'baz', marks: []},
        ],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {
        type: 'move.node',
        from: spanPath('b2', 's2'),
        to: spanPath('b1', 's2'),
      },
      {
        type: 'move.node',
        from: spanPath('b2', 's3'),
        to: spanPath('b1', 's3'),
      },
      {type: 'remove.node', path: [{_key: 'b2'}]},
    ] satisfies Array<Step>)
  })

  test('an intermediate matching node removed before the final value is not a destination', () => {
    const seed = [makeBlock('b0', 's0', 'foo tail')]
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}],
        position: 'after',
        items: [{_type: 'span', _key: 'scratch', text: 'tail', marks: []}],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b0'}, 'children', {_key: 'scratch'}],
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [...spanPath('b0', 's0'), 'text'],
        value: dmpPatch('foo tail', 'foo '),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath('b0', 'scratch')},
      {
        type: 'remove.text',
        path: spanPath('b0', 's0'),
        offset: 4,
        length: 4,
      },
    ] satisfies Array<Step>)
  })

  test('a structurally identical block replacement at the same index emits key changes', () => {
    const seed = [makeBlock('b1', 's1', 'foo')]
    const patches: Array<Patch> = [
      {type: 'unset', path: [{_key: 'b1'}], origin: 'local'},
      {
        type: 'insert',
        path: [0],
        position: 'before',
        items: [makeBlock('b2', 's2', 'foo')],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'set.key', path: [{_key: 'b1'}], newKey: 'b2'},
      {
        type: 'set.key',
        path: spanPath('b2', 's1'),
        newKey: 's2',
      },
    ] satisfies Array<Step>)
  })

  test('a fresh-key copy away from a removed block stays an insertion and removal', () => {
    const seed = [
      makeBlock('b0', 's0', 'hello'),
      makeBlock('b1', 's1', 'foo'),
      makeBlock('b2', 's2', 'bye'),
    ]
    const patches: Array<Patch> = [
      {type: 'unset', path: [{_key: 'b1'}], origin: 'remote'},
      {
        type: 'insert',
        path: [{_key: 'b2'}],
        position: 'after',
        items: [makeBlock('n2', 'm2', 'foo')],
        origin: 'remote',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: [{_key: 'b1'}]},
    ] satisfies Array<Step>)
  })

  test('more than one structurally identical replacement prevents rekey inference', () => {
    const seed = [
      makeBlock('b0', 's0', 'hello'),
      makeBlock('b1', 's1', 'foo'),
      makeBlock('b2', 's2', 'bye'),
    ]
    const patches: Array<Patch> = [
      {type: 'unset', path: [{_key: 'b1'}], origin: 'remote'},
      {
        type: 'insert',
        path: [{_key: 'b0'}],
        position: 'after',
        items: [makeBlock('n1', 'm1', 'foo')],
        origin: 'remote',
      },
      {
        type: 'insert',
        path: [{_key: 'b2'}],
        position: 'after',
        items: [makeBlock('n2', 'm2', 'foo')],
        origin: 'remote',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: [{_key: 'b1'}]},
    ] satisfies Array<Step>)
  })

  test('a same-key move subsumes text that reconstructs the destination node', () => {
    const seed = [
      makeBlock('b1', 's1', 'foo'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'bar', marks: []},
          {_type: 'span', _key: 's3', text: 'baz', marks: []},
        ],
      } satisfies PortableTextBlock,
    ]
    const patches: Array<Patch> = [
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [{_type: 'span', _key: 's3', text: '', marks: []}],
        origin: 'local',
      },
      {type: 'unset', path: [{_key: 'b2'}], origin: 'local'},
      {
        type: 'diffMatchPatch',
        path: [...spanPath('b1', 's3'), 'text'],
        value: dmpPatch('', 'baz'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {
        type: 'move.node',
        from: spanPath('b2', 's3'),
        to: spanPath('b1', 's3'),
      },
      {type: 'remove.node', path: [{_key: 'b2'}]},
    ] satisfies Array<Step>)
  })

  test('two identical splits in one batch resolve the ambiguity to no pairing', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b2 = 'b2'
    const s2 = 's2'
    const b3 = 'b3'
    const s3 = 's3'
    const b4 = 'b4'
    const s4 = 's4'
    const seed = [makeBlock(b1, s1, 'foo xyz'), makeBlock(b2, s2, 'bar xyz')]

    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b1, s1), 'text'],
        value: dmpPatch('foo xyz', 'foo '),
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b2, s2), 'text'],
        value: dmpPatch('bar xyz', 'bar '),
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: b1}],
        position: 'after',
        items: [makeBlock(b3, s3, 'xyz')],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: b2}],
        position: 'after',
        items: [makeBlock(b4, s4, 'xyz')],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.text', path: spanPath(b1, s1), offset: 4, length: 3},
      {type: 'remove.text', path: spanPath(b2, s2), offset: 4, length: 3},
    ] satisfies Array<Step>)
  })

  test('a span emptied by diffMatchPatch and then unset never offers its pre-empty text as a removal', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b2 = 'b2'
    const s2 = 's2'
    const seed = [makeBlock(b1, s1, 'abc'), makeBlock(b2, s2, '')]

    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b1, s1), 'text'],
        value: dmpPatch('abc', ''),
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: b1}, 'children', {_key: s1}],
        origin: 'local',
      },
      // Unrelated: someone types "abc" into block 2's existing span.
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b2, s2), 'text'],
        value: dmpPatch('', 'abc'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.text', path: spanPath(b1, s1), offset: 0, length: 3},
      {type: 'remove.node', path: spanPath(b1, s1)},
      {
        type: 'insert.text',
        path: spanPath(b2, s2),
        offset: 0,
        length: 3,
      },
    ] satisfies Array<Step>)
  })

  test('a whole-node removal matched by a node insertion and a fold at once pairs with neither', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b3 = 'b3'
    const s3 = 's3'
    const b4 = 'b4'
    const s4 = 's4'
    const seed = [makeBlock(b1, s1, 'bar'), makeBlock(b3, s3, 'foo')]

    const patches: Array<Patch> = [
      {
        type: 'unset',
        path: [{_key: b1}, 'children', {_key: s1}],
        origin: 'local',
      },
      // Unrelated: a brand-new node also carrying "bar".
      {
        type: 'insert',
        path: [{_key: b3}],
        position: 'after',
        items: [makeBlock(b4, s4, 'bar')],
        origin: 'local',
      },
      // Unrelated: someone types "bar" onto the end of block 3's span.
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b3, s3), 'text'],
        value: dmpPatch('foo', 'foobar'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath(b1, s1)},
      {
        type: 'insert.text',
        path: spanPath(b3, s3),
        offset: 3,
        length: 3,
      },
    ] satisfies Array<Step>)
  })

  test('a one-character whole-node removal never folds, even into a span typed at its exact end', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b2 = 'b2'
    const s2 = 's2'
    const seed = [makeBlock(b1, s1, 'x'), makeBlock(b2, s2, 'foo')]

    const patches: Array<Patch> = [
      {
        type: 'unset',
        path: [{_key: b1}, 'children', {_key: s1}],
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b2, s2), 'text'],
        value: dmpPatch('foo', 'foox'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath(b1, s1)},
      {
        type: 'insert.text',
        path: spanPath(b2, s2),
        offset: 3,
        length: 1,
      },
    ] satisfies Array<Step>)
  })

  test("a fold landing mid-span, not at the destination's end, never pairs", () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b2 = 'b2'
    const s2 = 's2'
    const seed = [makeBlock(b1, s1, 'bar'), makeBlock(b2, s2, 'fooXY')]

    const patches: Array<Patch> = [
      {
        type: 'unset',
        path: [{_key: b1}, 'children', {_key: s1}],
        origin: 'local',
      },
      // Typed "bar" between the existing "X" and "Y", not at the span's end.
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b2, s2), 'text'],
        value: dmpPatch('fooXY', 'fooXbarY'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath(b1, s1)},
      {
        type: 'insert.text',
        path: spanPath(b2, s2),
        offset: 4,
        length: 3,
      },
    ] satisfies Array<Step>)

    const mapped = mapPoint(steps, {
      path: spanPath(b2, s2),
      offset: 4,
    })

    expect(mapped).toEqual({path: spanPath(b2, s2), offset: 7})
  })

  test('a removed key that reappears in more than one inserted node pairs with neither', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b2 = 'b2'
    const b3 = 'b3'
    const seed = [makeBlock(b1, s1, 'foo')]

    const patches: Array<Patch> = [
      {
        type: 'unset',
        path: [{_key: b1}, 'children', {_key: s1}],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: b1}],
        position: 'after',
        items: [makeBlock(b2, s1, 'bar')],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: b2}],
        position: 'after',
        items: [makeBlock(b3, s1, 'baz')],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath(b1, s1)},
    ] satisfies Array<Step>)
  })

  test('a key unset from two duplicate-keyed nodes and reinserted once pairs with neither', () => {
    const bHead = 'bHead'
    const bTail = 'bTail'
    const k1 = 'k1'
    const bNew = 'bNew'
    // The base document already carries the duplicate key: the state a
    // multi-span split leaves before its reused key gets resolved, here
    // caught before that resolution happens.
    const seed = [makeBlock(bHead, k1, 'foo'), makeBlock(bTail, k1, 'bar')]

    const patches: Array<Patch> = [
      {
        type: 'unset',
        path: [{_key: bHead}, 'children', {_key: k1}],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: bTail}, 'children', {_key: k1}],
        origin: 'local',
      },
      {
        type: 'insert',
        path: [{_key: bTail}],
        position: 'after',
        items: [makeBlock(bNew, k1, 'qux')],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath(bHead, k1)},
      {type: 'remove.node', path: spanPath(bTail, k1)},
    ] satisfies Array<Step>)
  })

  test('a genuine child unset invalidates its caret before the parent block moves', () => {
    const anchor = 'anchor'
    const sAnchor = 'sAnchor'
    const bA = 'bA'
    const sX = 'sX'
    const sChild = 'sChild'

    const seed = [
      makeBlock(anchor, sAnchor, 'anchor'),
      {
        _type: 'block',
        _key: bA,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: sX, text: 'foo', marks: []},
          {_type: 'span', _key: sChild, text: 'bar', marks: []},
        ],
      } satisfies PortableTextBlock,
    ]

    const patches: Array<Patch> = [
      {
        type: 'unset',
        path: [{_key: bA}, 'children', {_key: sChild}],
        origin: 'local',
      },
      {type: 'unset', path: [{_key: bA}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: anchor}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: bA,
            style: 'normal',
            markDefs: [],
            children: [{_type: 'span', _key: sX, text: 'foo', marks: []}],
          },
        ],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.node', path: [{_key: bA}, 'children', {_key: sChild}]},
      {type: 'move.node', from: [{_key: bA}], to: [{_key: bA}]},
    ] satisfies Array<Step>)

    const mapped = mapPoint(steps, {
      path: [{_key: bA}, 'children', {_key: sChild}],
      offset: 1,
    })
    expect(mapped).toEqual(null)
  })

  test('destination coordinates account for edits made to the destination between the move and its slot', () => {
    // Source: a span holding "ab" is fully removed as a whole node.
    const source = 'source'
    const sourceSpan = 'sourceSpan'
    // Destination: an existing span that first receives an unrelated "Z"
    // at its start, then absorbs the moved "ab" right after it.
    const destination = 'destination'
    const destinationSpan = 'destinationSpan'

    const seed = [
      makeBlock(source, sourceSpan, 'ab'),
      makeBlock(destination, destinationSpan, ''),
    ]

    const patches: Array<Patch> = [
      {type: 'unset', path: [{_key: source}], origin: 'local'},
      {
        type: 'diffMatchPatch',
        path: [...spanPath(destination, destinationSpan), 'text'],
        value: dmpPatch('', 'Z'),
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [...spanPath(destination, destinationSpan), 'text'],
        value: dmpPatch('Z', 'Zab'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    const mapped = mapPoint(steps, {
      path: spanPath(source, sourceSpan),
      offset: 1,
    })

    expect(mapped).toEqual({
      path: spanPath(destination, destinationSpan),
      offset: 2,
    })
  })

  test('a descendant renamed twice in one transaction still resolves its own move', () => {
    const source = 'source'
    const sibling = 'sibling'
    const destination = 'destination'
    const anchor = 'anchor'
    const seed = [
      {
        _type: 'block',
        _key: source,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 'A', text: 'foo', marks: []},
          {_type: 'span', _key: sibling, text: 'zzz', marks: []},
        ],
      } satisfies PortableTextBlock,
      makeBlock(destination, anchor, 'bar'),
    ]

    const patches: Array<Patch> = [
      {
        type: 'set',
        path: [{_key: source}, 'children', {_key: 'A'}, '_key'],
        value: 'B',
        origin: 'local',
      },
      {
        type: 'set',
        path: [{_key: source}, 'children', {_key: 'B'}, '_key'],
        value: 'C',
        origin: 'local',
      },
      {type: 'unset', path: [{_key: source}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: destination}, 'children', {_key: anchor}],
        position: 'after',
        items: [{_type: 'span', _key: 'C', text: 'foo', marks: []}],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {
        type: 'set.key',
        path: [{_key: source}, 'children', {_key: 'A'}],
        newKey: 'B',
      },
      {
        type: 'set.key',
        path: [{_key: source}, 'children', {_key: 'B'}],
        newKey: 'C',
      },
      {
        type: 'move.node',
        from: [{_key: source}, 'children', {_key: 'C'}],
        to: [{_key: destination}, 'children', {_key: 'C'}],
      },
      {type: 'remove.node', path: [{_key: source}]},
    ] satisfies Array<Step>)

    const mapped = mapPoint(steps, {
      path: [{_key: source}, 'children', {_key: 'A'}],
      offset: 2,
    })

    expect(mapped).toEqual({
      path: [{_key: destination}, 'children', {_key: 'C'}],
      offset: 2,
    })
  })

  test('a rename recorded on a container that later changes identity pairs with nothing', () => {
    const originalContainerKey = 'kB'
    const renamedContainerKey = 'kC'
    const seed = [makeBlock(originalContainerKey, 'A', 'foo')]

    const patches: Array<Patch> = [
      // The descendant is renamed while its container still answers to
      // `kB`: the lineage this records lives at `kB/children/B`.
      {
        type: 'set',
        path: [{_key: originalContainerKey}, 'children', {_key: 'A'}, '_key'],
        value: 'B',
        origin: 'local',
      },
      // The container itself is renamed next, the same shape a
      // colliding-block rename ahead of a merge produces: the descendant's
      // recorded lineage still reads `kB`, which the container no longer
      // answers to.
      {
        type: 'set',
        path: [{_key: originalContainerKey}, '_key'],
        value: renamedContainerKey,
        origin: 'local',
      },
      {type: 'unset', path: [{_key: renamedContainerKey}], origin: 'local'},
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {
        type: 'set.key',
        path: [{_key: originalContainerKey}, 'children', {_key: 'A'}],
        newKey: 'B',
      },
      {
        type: 'set.key',
        path: [{_key: originalContainerKey}],
        newKey: renamedContainerKey,
      },
      {type: 'remove.node', path: [{_key: renamedContainerKey}]},
    ] satisfies Array<Step>)

    const mapped = mapPoint(steps, {
      path: [{_key: originalContainerKey}, 'children', {_key: 'A'}],
      offset: 2,
    })

    expect(mapped).toBeNull()
  })
})

describe(interpretTransaction.name, () => {
  test('a field patch on the root array emits no step and leaves a point unchanged', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const otherBlockKey = keyGenerator()
    const otherSpanKey = keyGenerator()
    const patches: Array<Patch> = [
      {
        type: 'set',
        path: ['children'],
        value: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        origin: 'local',
      },
    ]
    const steps = interpretTransaction([], patches)
    expect(steps).toEqual([])
    const point = {
      path: [{_key: otherBlockKey}, 'children', {_key: otherSpanKey}],
      offset: 5,
    }
    expect(mapPoint(steps, point)).toBe(point)
  })
})

describe('interpretTransaction oracle: repeated text across two blocks', () => {
  const repeatedWord = 'wolf'

  function twoBlockSeed(keyGenerator: () => string): {
    seed: Array<PortableTextBlock>
    b1: string
    s1: string
    b2: string
    s2: string
  } {
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()
    return {
      seed: [
        makeBlock(b1, s1, `${repeatedWord} one`),
        makeBlock(b2, s2, `${repeatedWord} two`),
      ],
      b1,
      s1,
      b2,
      s2,
    }
  }

  test('deleting the word from one block while typing it in the other keeps both blocks stable', () => {
    let cases = 0

    // Every caret position in both blocks, so the sweep is exhaustive over
    // the small space rather than sampled.
    for (const deleteFrom of ['first', 'second'] as const) {
      const keyGenerator = createTestKeyGenerator()
      const {seed, b1, s1, b2, s2} = twoBlockSeed(keyGenerator)

      const [deletionBlock, deletionSpan, typingBlock, typingSpan] =
        deleteFrom === 'first' ? [b1, s1, b2, s2] : [b2, s2, b1, s1]

      const originalText =
        deleteFrom === 'first' ? `${repeatedWord} one` : `${repeatedWord} two`
      const typingOriginalText =
        deleteFrom === 'first' ? `${repeatedWord} two` : `${repeatedWord} one`

      const patches: Array<Patch> = [
        {
          type: 'diffMatchPatch',
          path: [...spanPath(deletionBlock, deletionSpan), 'text'],
          value: dmpPatch(
            originalText,
            originalText.slice(repeatedWord.length),
          ),
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [...spanPath(typingBlock, typingSpan), 'text'],
          value: dmpPatch(
            typingOriginalText,
            `${repeatedWord} ${typingOriginalText}`,
          ),
          origin: 'local',
        },
      ]

      const steps = interpretTransaction(seed, patches)

      expect(steps.some((step) => step.type === 'move.text')).toBe(false)

      for (const path of [
        spanPath(deletionBlock, deletionSpan),
        spanPath(typingBlock, typingSpan),
      ]) {
        for (let offset = 0; offset <= originalText.length; offset++) {
          const mapped = mapPoint(steps, {path, offset})
          expect(mapped).not.toBeNull()
          expect(mapped!.path).toEqual(path)
          cases++
        }
      }
    }

    // Exhaustive over the small space, so the run is deterministic
    // without a seeded RNG.
    expect(cases).toBe(36)
  })
})

function dmpPatch(oldText: string, newText: string): string {
  return stringifyPatches(makePatches(oldText, newText))
}

describe('interpretTransaction: span keys repeated in other blocks', () => {
  // Span keys are only unique within a block. A merge that carries spans
  // into the previous block must still read as moves when another block
  // happens to hold a span with the same key.
  const block = (key: string, spans: Array<[string, string]>) =>
    ({
      _type: 'block',
      _key: key,
      style: 'normal',
      markDefs: [],
      children: spans.map(([spanKey, text]) => ({
        _type: 'span',
        _key: spanKey,
        text,
        marks: [],
      })),
    }) satisfies PortableTextBlock

  test('merging "def"+"ghi" into "abc" moves both spans, though "baz" elsewhere shares the key of "def"', () => {
    const base = [
      block('b0', [['s0', 'abc']]),
      block('b1', [
        ['s1', 'def'],
        ['s2', 'ghi'],
      ]),
      block('b2', [['s1', 'baz']]),
    ]
    const steps = interpretTransaction(base, [
      {type: 'unset', path: [{_key: 'b1'}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}],
        position: 'after',
        items: base[1]!.children,
        origin: 'local',
      },
    ])

    expect(mapPoint(steps, {path: spanPath('b1', 's1'), offset: 1})).toEqual({
      path: spanPath('b0', 's1'),
      offset: 1,
    })
    expect(mapPoint(steps, {path: spanPath('b1', 's2'), offset: 1})).toEqual({
      path: spanPath('b0', 's2'),
      offset: 1,
    })
  })

  test('a merge that folds the carried "def" into "abc" after moving it still follows "def", though "baz" elsewhere shares its key', () => {
    const base = [
      block('b0', [['s0', 'abc']]),
      block('b1', [
        ['s1', 'def'],
        ['s2', 'ghi'],
      ]),
      block('b2', [['s1', 'baz']]),
    ]
    const steps = interpretTransaction(base, [
      {type: 'unset', path: [{_key: 'b1'}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}],
        position: 'after',
        items: base[1]!.children,
        origin: 'local',
      },
      {
        type: 'diffMatchPatch',
        path: [{_key: 'b0'}, 'children', {_key: 's0'}, 'text'],
        value: '@@ -1,3 +1,6 @@\n abc\n+def\n',
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b0'}, 'children', {_key: 's1'}],
        origin: 'local',
      },
    ])

    expect(mapPoint(steps, {path: spanPath('b1', 's1'), offset: 1})).toEqual({
      path: spanPath('b0', 's0'),
      offset: 4,
    })
  })
})

describe('interpretTransaction: a span edited before its block merges', () => {
  const seed = (): Array<PortableTextBlock> => [
    makeBlock('b1', 's1', 'abc'),
    {
      _type: 'block',
      _key: 'b2',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 's2', text: 'XYdef', marks: []},
        {_type: 'span', _key: 's3', text: ' ghi', marks: []},
      ],
    } satisfies PortableTextBlock,
  ]
  // Deleting "XY" across the break into "abc|XYdef ghi": the merge first
  // trims "XY" off s2 in place, then unsets b2 and re-inserts s2 and s3,
  // as they now are, after s1.
  const patches: Array<Patch> = [
    {
      type: 'diffMatchPatch',
      path: [...spanPath('b2', 's2'), 'text'],
      value: dmpPatch('XYdef', 'def'),
      origin: 'local',
    },
    {type: 'unset', path: [{_key: 'b2'}], origin: 'local'},
    {
      type: 'insert',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      position: 'after',
      items: [
        {_type: 'span', _key: 's2', text: 'def', marks: []},
        {_type: 'span', _key: 's3', text: ' ghi', marks: []},
      ],
      origin: 'local',
    },
  ]

  test('"d", after the trimmed "XY", lands at the start of the moved "def"', () => {
    const steps = interpretTransaction(seed(), patches)

    expect(mapPoint(steps, {path: spanPath('b2', 's2'), offset: 2})).toEqual({
      path: spanPath('b1', 's2'),
      offset: 0,
    })
  })

  test('the end of "def" lands at the end of the moved "def", not past it', () => {
    const steps = interpretTransaction(seed(), patches)

    expect(mapPoint(steps, {path: spanPath('b2', 's2'), offset: 5})).toEqual({
      path: spanPath('b1', 's2'),
      offset: 3,
    })
  })
})

describe('interpretTransaction: a merged block whose first span was emptied', () => {
  test('"def", after an emptied "abc", follows its own span into the merged block', () => {
    const seed: Array<PortableTextBlock> = [
      makeBlock('b1', 's1', 'xyz'),
      {
        _type: 'block',
        _key: 'b2',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's2', text: 'abc', marks: ['strong']},
          {_type: 'span', _key: 's3', text: 'def', marks: []},
        ],
      } satisfies PortableTextBlock,
    ]
    // Deleting "abc" across the break into "xyz|abcdef": "abc" is emptied in
    // place, then b2 merges into b1 and the empty span is dropped.
    const patches: Array<Patch> = [
      {
        type: 'diffMatchPatch',
        path: [...spanPath('b2', 's2'), 'text'],
        value: dmpPatch('abc', ''),
        origin: 'local',
      },
      {type: 'unset', path: [{_key: 'b2'}], origin: 'local'},
      {
        type: 'insert',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        position: 'after',
        items: [
          {_type: 'span', _key: 's2', text: '', marks: ['strong']},
          {_type: 'span', _key: 's3', text: 'def', marks: []},
        ],
        origin: 'local',
      },
      {
        type: 'unset',
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(mapPoint(steps, {path: spanPath('b2', 's3'), offset: 1})).toEqual({
      path: spanPath('b1', 's3'),
      offset: 1,
    })
  })
})

describe('interpretTransaction: a span key removed from two blocks at once', () => {
  // Deleting from the end of "abc" through "XY" in "abc|gone|XYdef ghi": b2
  // is deleted outright, b3's first span is trimmed, then b3 merges into b1
  // and "def" folds into "abc". Both removed blocks held a span keyed s2;
  // only b3's comes back.
  const seed = (): Array<PortableTextBlock> => [
    makeBlock('b1', 's1', 'abc'),
    makeBlock('b2', 's2', 'gone'),
    {
      _type: 'block',
      _key: 'b3',
      style: 'normal',
      markDefs: [],
      children: [
        {_type: 'span', _key: 's2', text: 'XYdef', marks: []},
        {_type: 'span', _key: 's4', text: ' ghi', marks: ['strong']},
      ],
    } satisfies PortableTextBlock,
  ]
  const patches: Array<Patch> = [
    {type: 'unset', path: [{_key: 'b2'}], origin: 'local'},
    {
      type: 'diffMatchPatch',
      path: [...spanPath('b3', 's2'), 'text'],
      value: dmpPatch('XYdef', 'def'),
      origin: 'local',
    },
    {type: 'unset', path: [{_key: 'b3'}], origin: 'local'},
    {
      type: 'insert',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      position: 'after',
      items: [
        {_type: 'span', _key: 's2', text: 'def', marks: []},
        {_type: 'span', _key: 's4', text: ' ghi', marks: ['strong']},
      ],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [...spanPath('b1', 's1'), 'text'],
      value: dmpPatch('abc', 'abcdef'),
      origin: 'local',
    },
    {
      type: 'unset',
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      origin: 'local',
    },
  ]

  test('"e" in "XYdef" follows the fold to "abcdef"', () => {
    const steps = interpretTransaction(seed(), patches)

    expect(mapPoint(steps, {path: spanPath('b3', 's2'), offset: 3})).toEqual({
      path: spanPath('b1', 's1'),
      offset: 4,
    })
  })

  test('the end of "XYdef" lands at the end of "abcdef"', () => {
    const steps = interpretTransaction(seed(), patches)

    expect(
      mapPoint(
        steps,
        {path: spanPath('b3', 's2'), offset: 5},
        {affinity: 'backward'},
      ),
    ).toEqual({path: spanPath('b1', 's1'), offset: 6})
  })
})

describe(interpretTransaction.name, () => {
  test('numeric text patch maps keyed point', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [
                {_type: 'span', _key: key1, text: 'foobar', marks: []},
              ],
              markDefs: [],
            },
          ],
          [{type: 'set', path: [0, 'children', 0, 'text'], value: 'foo'}],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 6},
      ),
    ).toEqual({path: [{_key: key0}, 'children', {_key: key1}], offset: 3})
  })
})

describe(interpretTransaction.name, () => {
  test('numeric root unset invalidates descendants', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              markDefs: [],
            },
          ],
          [{type: 'unset', path: [0]}],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 1},
      ),
    ).toEqual(null)
  })
})

describe(interpretTransaction.name, () => {
  test('nested one-character span merge preserves range', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    const key5 = keyGenerator()
    const key6 = keyGenerator()
    expect(
      mapRangeInward(
        [
          {
            _type: 'callout',
            _key: key0,
            content: [
              {
                _type: 'table',
                _key: key1,
                rows: [
                  {
                    _type: 'row',
                    _key: key2,
                    cells: [
                      {
                        _type: 'cell',
                        _key: key3,
                        content: [
                          {
                            _type: 'block',
                            _key: key4,
                            children: [
                              {
                                _type: 'span',
                                _key: key5,
                                text: 'foo',
                                marks: [],
                              },
                              {_type: 'span', _key: key6, text: 'x', marks: []},
                            ],
                            markDefs: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        interpretTransaction(
          [
            {
              _type: 'callout',
              _key: key0,
              content: [
                {
                  _type: 'table',
                  _key: key1,
                  rows: [
                    {
                      _type: 'row',
                      _key: key2,
                      cells: [
                        {
                          _type: 'cell',
                          _key: key3,
                          content: [
                            {
                              _type: 'block',
                              _key: key4,
                              children: [
                                {
                                  _type: 'span',
                                  _key: key5,
                                  text: 'foo',
                                  marks: [],
                                },
                                {
                                  _type: 'span',
                                  _key: key6,
                                  text: 'x',
                                  marks: [],
                                },
                              ],
                              markDefs: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          [
            {
              type: 'diffMatchPatch',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
                'children',
                {_key: key5},
                'text',
              ],
              value: '@@ -1,3 +1,4 @@\n foo\n+x\n',
            },
            {
              type: 'unset',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
                'children',
                {_key: key6},
              ],
            },
          ],
        ),
        {
          anchor: {
            path: [
              {_key: key0},
              'content',
              {_key: key1},
              'rows',
              {_key: key2},
              'cells',
              {_key: key3},
              'content',
              {_key: key4},
              'children',
              {_key: key6},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: key0},
              'content',
              {_key: key1},
              'rows',
              {_key: key2},
              'cells',
              {_key: key3},
              'content',
              {_key: key4},
              'children',
              {_key: key6},
            ],
            offset: 1,
          },
        },
      ),
    ).toEqual({
      anchor: {
        path: [
          {_key: key0},
          'content',
          {_key: key1},
          'rows',
          {_key: key2},
          'cells',
          {_key: key3},
          'content',
          {_key: key4},
          'children',
          {_key: key5},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: key0},
          'content',
          {_key: key1},
          'rows',
          {_key: key2},
          'cells',
          {_key: key3},
          'content',
          {_key: key4},
          'children',
          {_key: key5},
        ],
        offset: 4,
      },
    })
  })
})

describe(interpretTransaction.name, () => {
  test('nested split with siblings preserves split tail', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    const key5 = keyGenerator()
    const key6 = keyGenerator()
    const key7 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'callout',
              _key: key0,
              content: [
                {
                  _type: 'table',
                  _key: key1,
                  rows: [
                    {
                      _type: 'row',
                      _key: key2,
                      cells: [
                        {
                          _type: 'cell',
                          _key: key3,
                          content: [
                            {
                              _type: 'block',
                              _key: key4,
                              children: [
                                {
                                  _type: 'span',
                                  _key: key5,
                                  text: 'foobar',
                                  marks: [],
                                },
                                {
                                  _type: 'span',
                                  _key: key6,
                                  text: 'baz',
                                  marks: [],
                                },
                              ],
                              markDefs: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          [
            {
              type: 'diffMatchPatch',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
                'children',
                {_key: key5},
                'text',
              ],
              value: '@@ -1,6 +1,3 @@\n foo\n-bar\n',
            },
            {
              type: 'diffMatchPatch',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
                'children',
                {_key: key6},
                'text',
              ],
              value: '@@ -1,3 +0,0 @@\n-baz\n',
            },
            {
              type: 'insert',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
              ],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: key7,
                  children: [
                    {_type: 'span', _key: key5, text: 'bar', marks: []},
                    {_type: 'span', _key: key6, text: 'baz', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            },
            {
              type: 'unset',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
                'children',
                {_key: key6},
              ],
            },
          ],
        ),
        {
          path: [
            {_key: key0},
            'content',
            {_key: key1},
            'rows',
            {_key: key2},
            'cells',
            {_key: key3},
            'content',
            {_key: key4},
            'children',
            {_key: key5},
          ],
          offset: 4,
        },
      ),
    ).toEqual({
      path: [
        {_key: key0},
        'content',
        {_key: key1},
        'rows',
        {_key: key2},
        'cells',
        {_key: key3},
        'content',
        {_key: key7},
        'children',
        {_key: key5},
      ],
      offset: 1,
    })
  })
})

describe(interpretTransaction.name, () => {
  test('child deletion remains invalid after parent reorder', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [
                {_type: 'span', _key: key1, text: 'foo', marks: []},
                {_type: 'span', _key: key2, text: 'bar', marks: []},
              ],
              markDefs: [],
            },
            {
              _type: 'block',
              _key: key3,
              children: [{_type: 'span', _key: key4, text: 'baz', marks: []}],
              markDefs: [],
            },
          ],
          [
            {type: 'unset', path: [{_key: key0}, 'children', {_key: key2}]},
            {type: 'unset', path: [{_key: key0}]},
            {
              type: 'insert',
              path: [{_key: key3}],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: key0,
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key2}], offset: 1},
      ),
    ).toEqual(null)
  })
})

describe(interpretTransaction.name, () => {
  test('null item before keyed target at root', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            null,
            {
              _type: 'block',
              _key: key0,
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              markDefs: [],
            },
          ] as unknown as Array<PortableTextBlock>,
          [
            {
              type: 'diffMatchPatch',
              path: [{_key: key0}, 'children', {_key: key1}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 3},
      ),
    ).toEqual({path: [{_key: key0}, 'children', {_key: key1}], offset: 6})
  })
})

describe(interpretTransaction.name, () => {
  test('null item before keyed target at children', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [
                null,
                {_type: 'span', _key: key1, text: 'foo', marks: []},
              ],
              markDefs: [],
            },
          ] as unknown as Array<PortableTextBlock>,
          [
            {
              type: 'diffMatchPatch',
              path: [{_key: key0}, 'children', {_key: key1}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 3},
      ),
    ).toEqual({path: [{_key: key0}, 'children', {_key: key1}], offset: 6})
  })
})

describe(interpretTransaction.name, () => {
  test('null item before keyed target at nested', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    const key5 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'callout',
              _key: key0,
              content: [
                {
                  _type: 'table',
                  _key: key1,
                  rows: [
                    {
                      _type: 'row',
                      _key: key2,
                      cells: [
                        {
                          _type: 'cell',
                          _key: key3,
                          content: [
                            null,
                            {
                              _type: 'block',
                              _key: key4,
                              children: [
                                {
                                  _type: 'span',
                                  _key: key5,
                                  text: 'foo',
                                  marks: [],
                                },
                              ],
                              markDefs: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ] as unknown as Array<PortableTextBlock>,
          [
            {
              type: 'diffMatchPatch',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
                'children',
                {_key: key5},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
            },
          ],
        ),
        {
          path: [
            {_key: key0},
            'content',
            {_key: key1},
            'rows',
            {_key: key2},
            'cells',
            {_key: key3},
            'content',
            {_key: key4},
            'children',
            {_key: key5},
          ],
          offset: 3,
        },
      ),
    ).toEqual({
      path: [
        {_key: key0},
        'content',
        {_key: key1},
        'rows',
        {_key: key2},
        'cells',
        {_key: key3},
        'content',
        {_key: key4},
        'children',
        {_key: key5},
      ],
      offset: 6,
    })
  })
})

describe(interpretTransaction.name, () => {
  test('insert candidates come from the replayed value when the anchor is absent', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [
                {_type: 'span', _key: key1, text: 'foobar', marks: []},
              ],
              markDefs: [],
            },
          ],
          [
            {
              type: 'diffMatchPatch',
              path: [{_key: key0}, 'children', {_key: key1}, 'text'],
              value: '@@ -1,6 +1,3 @@\n foo\n-bar\n',
            },
            {
              type: 'insert',
              path: [{_key: key2}],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: key3,
                  children: [
                    {_type: 'span', _key: key4, text: 'bar', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 4},
      ),
    ).toEqual({path: [{_key: key0}, 'children', {_key: key1}], offset: 3})
  })
})

describe(interpretTransaction.name, () => {
  test('set root value invalidates removed span', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              markDefs: [],
            },
          ],
          [
            {
              type: 'set',
              path: [],
              value: [
                {
                  _type: 'block',
                  _key: key2,
                  children: [
                    {_type: 'span', _key: key3, text: 'bar', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 1},
      ),
    ).toEqual(null)
  })
})

describe(interpretTransaction.name, () => {
  test('numeric targeting with empty keys at children', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [
                {_type: 'span', _key: '', text: 'foobar', marks: []},
                {_type: 'span', _key: key1, text: 'bar', marks: []},
              ],
              markDefs: [],
            },
          ],
          [
            {
              type: 'set',
              path: [{_key: key0}, 'children', 0, 'text'],
              value: 'foo',
            },
          ],
        ),
        {path: [{_key: key0}, 'children', 0], offset: 6},
      ),
    ).toEqual({path: [{_key: key0}, 'children', 0], offset: 3})
  })
})

describe(interpretTransaction.name, () => {
  test('converts a unique key to an index before inserting its duplicate', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const steps = interpretTransaction(
      [
        {
          _type: 'block',
          _key: blockKey,
          markDefs: [],
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ],
      [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'before',
          items: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
        },
      ],
    )
    expect(steps).toEqual([
      {
        type: 'move.node',
        from: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        to: [{_key: 'k0'}, 'children', 0],
      },
      {type: 'insert.node', path: [{_key: 'k0'}, 'children', 0], count: 1},
    ])
    expect(
      mapPoint(steps, {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 1,
      }),
    ).toEqual({path: [{_key: 'k0'}, 'children', 1], offset: 1})
  })

  test('emits one insertion step for a thousand index-addressed siblings', () => {
    const base = Array.from({length: 1000}, () => ({
      _type: 'block',
      children: [],
      markDefs: [],
    }))
    const steps = interpretTransaction(
      base as unknown as Array<PortableTextBlock>,
      [
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [{_type: 'block', children: [], markDefs: []}],
        },
      ],
    )
    expect(steps).toEqual([{type: 'insert.node', path: [0], count: 1}])
    expect(mapPoint(steps, {path: [999, 'children', 0], offset: 1})).toEqual({
      path: [1000, 'children', 0],
      offset: 1,
    })
  })

  test('numeric targeting with missing keys at children', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [
                {_type: 'span', text: 'foobar', marks: []},
                {_type: 'span', _key: key1, text: 'bar', marks: []},
              ],
              markDefs: [],
            },
          ] as unknown as Array<PortableTextBlock>,
          [
            {
              type: 'set',
              path: [{_key: key0}, 'children', 0, 'text'],
              value: 'foo',
            },
          ],
        ),
        {path: [{_key: key0}, 'children', 0], offset: 6},
      ),
    ).toEqual({path: [{_key: key0}, 'children', 0], offset: 3})
  })
})

describe(interpretTransaction.name, () => {
  test('numeric targeting with duplicate keys at children', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [
                {_type: 'span', _key: key1, text: 'foobar', marks: []},
                {_type: 'span', _key: key1, text: 'bar', marks: []},
              ],
              markDefs: [],
            },
          ],
          [
            {
              type: 'set',
              path: [{_key: key0}, 'children', 0, 'text'],
              value: 'foo',
            },
          ],
        ),
        {path: [{_key: key0}, 'children', 0], offset: 6},
      ),
    ).toEqual({path: [{_key: key0}, 'children', 0], offset: 3})
  })
})

describe(interpretTransaction.name, () => {
  test('negative insert anchor keeps later edits on moved node', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              markDefs: [],
            },
            {
              _type: 'block',
              _key: key2,
              children: [{_type: 'span', _key: key3, text: 'baz', marks: []}],
              markDefs: [],
            },
          ],
          [
            {type: 'unset', path: [{_key: key0}]},
            {
              type: 'insert',
              path: [-1],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: key0,
                  children: [
                    {_type: 'span', _key: key1, text: 'foo', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            },
            {
              type: 'diffMatchPatch',
              path: [{_key: key0}, 'children', {_key: key1}, 'text'],
              value: '@@ -1,3 +0,0 @@\n-foo\n',
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 2},
      ),
    ).toEqual({path: [{_key: key0}, 'children', {_key: key1}], offset: 0})
  })
})

describe(interpretTransaction.name, () => {
  test('replace anchor invalidates the replaced child', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              markDefs: [],
            },
          ],
          [
            {
              type: 'insert',
              path: [{_key: key0}, 'children', {_key: key1}],
              position: 'replace',
              items: [{_type: 'span', _key: key2, text: 'bar', marks: []}],
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 1},
      ),
    ).toEqual(null)
  })
})

describe(interpretTransaction.name, () => {
  test('inserting null before text edit at root', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              markDefs: [],
            },
          ] as unknown as Array<PortableTextBlock>,
          [
            {
              type: 'insert',
              path: [{_key: key0}],
              position: 'before',
              items: [null as unknown as JSONValue],
            },
            {
              type: 'diffMatchPatch',
              path: [{_key: key0}, 'children', {_key: key1}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 3},
      ),
    ).toEqual({path: [{_key: key0}, 'children', {_key: key1}], offset: 6})
  })
})

describe(interpretTransaction.name, () => {
  test('inserting null before text edit at children', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              markDefs: [],
            },
          ] as unknown as Array<PortableTextBlock>,
          [
            {
              type: 'insert',
              path: [{_key: key0}, 'children', {_key: key1}],
              position: 'before',
              items: [null as unknown as JSONValue],
            },
            {
              type: 'diffMatchPatch',
              path: [{_key: key0}, 'children', {_key: key1}, 'text'],
              value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 3},
      ),
    ).toEqual({path: [{_key: key0}, 'children', {_key: key1}], offset: 6})
  })
})

describe(interpretTransaction.name, () => {
  test('inserting null before text edit at nested', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    const key5 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'callout',
              _key: key0,
              content: [
                {
                  _type: 'table',
                  _key: key1,
                  rows: [
                    {
                      _type: 'row',
                      _key: key2,
                      cells: [
                        {
                          _type: 'cell',
                          _key: key3,
                          content: [
                            {
                              _type: 'block',
                              _key: key4,
                              children: [
                                {
                                  _type: 'span',
                                  _key: key5,
                                  text: 'foo',
                                  marks: [],
                                },
                              ],
                              markDefs: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ] as unknown as Array<PortableTextBlock>,
          [
            {
              type: 'insert',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
              ],
              position: 'before',
              items: [null as unknown as JSONValue],
            },
            {
              type: 'diffMatchPatch',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
                'children',
                {_key: key5},
                'text',
              ],
              value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
            },
          ],
        ),
        {
          path: [
            {_key: key0},
            'content',
            {_key: key1},
            'rows',
            {_key: key2},
            'cells',
            {_key: key3},
            'content',
            {_key: key4},
            'children',
            {_key: key5},
          ],
          offset: 3,
        },
      ),
    ).toEqual({
      path: [
        {_key: key0},
        'content',
        {_key: key1},
        'rows',
        {_key: key2},
        'cells',
        {_key: key3},
        'content',
        {_key: key4},
        'children',
        {_key: key5},
      ],
      offset: 6,
    })
  })
})

describe(interpretTransaction.name, () => {
  test('duplicate replacement key never selects the wrong sibling', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [
                {_type: 'span', _key: key1, text: 'foo', marks: []},
                {_type: 'span', _key: key2, text: 'bar', marks: []},
              ],
              markDefs: [],
            },
          ],
          [
            {
              type: 'set',
              path: [{_key: key0}, 'children'],
              value: [
                {_type: 'span', _key: key3, text: 'foo', marks: []},
                {_type: 'span', _key: key3, text: 'bar', marks: []},
              ],
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key2}], offset: 1},
      ),
    ).toEqual({path: [{_key: key0}, 'children', 1], offset: 1})
  })
})

describe(interpretTransaction.name, () => {
  test('whole node set invalidates removed span', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'block',
              _key: key0,
              children: [{_type: 'span', _key: key1, text: 'foo', marks: []}],
              markDefs: [],
            },
          ],
          [
            {
              type: 'set',
              path: [{_key: key0}],
              value: {
                _type: 'block',
                _key: key0,
                children: [{_type: 'span', _key: key2, text: 'bar', marks: []}],
                markDefs: [],
              },
            },
          ],
        ),
        {path: [{_key: key0}, 'children', {_key: key1}], offset: 1},
      ),
    ).toEqual(null)
  })
})

describe(interpretTransaction.name, () => {
  test('unset container content invalidates nested span', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    const key5 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'callout',
              _key: key0,
              content: [
                {
                  _type: 'table',
                  _key: key1,
                  rows: [
                    {
                      _type: 'row',
                      _key: key2,
                      cells: [
                        {
                          _type: 'cell',
                          _key: key3,
                          content: [
                            {
                              _type: 'block',
                              _key: key4,
                              children: [
                                {
                                  _type: 'span',
                                  _key: key5,
                                  text: 'foo',
                                  marks: [],
                                },
                              ],
                              markDefs: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          [
            {
              type: 'unset',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
              ],
            },
          ],
        ),
        {
          path: [
            {_key: key0},
            'content',
            {_key: key1},
            'rows',
            {_key: key2},
            'cells',
            {_key: key3},
            'content',
            {_key: key4},
            'children',
            {_key: key5},
          ],
          offset: 1,
        },
      ),
    ).toEqual(null)
  })
})

describe(interpretTransaction.name, () => {
  test('nested structurally identical replacement preserves every span', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    const key5 = keyGenerator()
    const key6 = keyGenerator()
    const key7 = keyGenerator()
    const key8 = keyGenerator()
    const key9 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _type: 'callout',
              _key: key0,
              content: [
                {
                  _type: 'table',
                  _key: key1,
                  rows: [
                    {
                      _type: 'row',
                      _key: key2,
                      cells: [
                        {
                          _type: 'cell',
                          _key: key3,
                          content: [
                            {
                              _type: 'block',
                              _key: key4,
                              children: [
                                {
                                  _type: 'span',
                                  _key: key5,
                                  text: 'foo',
                                  marks: [],
                                },
                                {
                                  _type: 'span',
                                  _key: key6,
                                  text: 'bar',
                                  marks: [],
                                },
                              ],
                              markDefs: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          [
            {
              type: 'unset',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                {_key: key4},
              ],
            },
            {
              type: 'insert',
              path: [
                {_key: key0},
                'content',
                {_key: key1},
                'rows',
                {_key: key2},
                'cells',
                {_key: key3},
                'content',
                0,
              ],
              position: 'before',
              items: [
                {
                  _type: 'block',
                  _key: key7,
                  children: [
                    {_type: 'span', _key: key8, text: 'foo', marks: []},
                    {_type: 'span', _key: key9, text: 'bar', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            },
          ],
        ),
        {
          path: [
            {_key: key0},
            'content',
            {_key: key1},
            'rows',
            {_key: key2},
            'cells',
            {_key: key3},
            'content',
            {_key: key4},
            'children',
            {_key: key6},
          ],
          offset: 1,
        },
      ),
    ).toEqual({
      path: [
        {_key: key0},
        'content',
        {_key: key1},
        'rows',
        {_key: key2},
        'cells',
        {_key: key3},
        'content',
        {_key: key7},
        'children',
        {_key: key9},
      ],
      offset: 1,
    })
  })
})

describe(interpretTransaction.name, () => {
  test('moved descendant inside object field is recognized', () => {
    const keyGenerator = createTestKeyGenerator()
    const key0 = keyGenerator()
    const key1 = keyGenerator()
    const key2 = keyGenerator()
    const key3 = keyGenerator()
    const key4 = keyGenerator()
    expect(
      mapPoint(
        interpretTransaction(
          [
            {
              _key: key0,
              _type: 'object',
              details: {
                body: [
                  {
                    _type: 'block',
                    _key: key1,
                    children: [
                      {_type: 'span', _key: key2, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                  },
                ],
              },
            },
            {
              _type: 'block',
              _key: key3,
              children: [{_type: 'span', _key: key4, text: 'bar', marks: []}],
              markDefs: [],
            },
          ],
          [
            {type: 'unset', path: [{_key: key0}]},
            {
              type: 'insert',
              path: [{_key: key3}],
              position: 'after',
              items: [
                {
                  _type: 'block',
                  _key: key1,
                  children: [
                    {_type: 'span', _key: key2, text: 'foo', marks: []},
                  ],
                  markDefs: [],
                },
              ],
            },
          ],
        ),
        {
          path: [
            {_key: key0},
            'details',
            'body',
            {_key: key1},
            'children',
            {_key: key2},
          ],
          offset: 1,
        },
      ),
    ).toEqual({path: [{_key: key1}, 'children', {_key: key2}], offset: 1})
  })
})

describe(interpretTransaction.name, () => {
  test('a whole-value set invalidates old points even when only keys change', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const newBlockKey = keyGenerator()
    const newSpanKey = keyGenerator()
    const base = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const steps = interpretTransaction(base, [
      {
        type: 'set',
        path: [],
        value: [
          {
            _type: 'block',
            _key: newBlockKey,
            children: [
              {_type: 'span', _key: newSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
          },
        ],
      },
    ])
    expect(
      mapPoint(steps, {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 1,
      }),
    ).toEqual(null)
  })

  test('a field unset invalidates old points before equivalent content is reconstructed', () => {
    const keyGenerator = createTestKeyGenerator()
    const objectKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const newBlockKey = keyGenerator()
    const newSpanKey = keyGenerator()
    const base = [
      {
        _type: 'object',
        _key: objectKey,
        details: {
          body: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
      },
    ]
    const steps = interpretTransaction(base, [
      {type: 'unset', path: [{_key: objectKey}, 'details', 'body']},
      {
        type: 'setIfMissing',
        path: [{_key: objectKey}, 'details', 'body'],
        value: [
          {
            _type: 'block',
            _key: newBlockKey,
            children: [
              {_type: 'span', _key: newSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
          },
        ],
      },
    ])
    expect(
      mapPoint(steps, {
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
        offset: 1,
      }),
    ).toEqual(null)
  })

  test('a whole-node set invalidates old points before the replaced node moves', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const otherBlockKey = keyGenerator()
    const otherSpanKey = keyGenerator()
    const base = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: otherBlockKey,
        children: [{_type: 'span', _key: otherSpanKey, text: 'baz', marks: []}],
        markDefs: [],
      },
    ]
    const steps = interpretTransaction(base, [
      {
        type: 'set',
        path: [{_key: blockKey}],
        value: {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
          markDefs: [],
        },
      },
      {type: 'unset', path: [{_key: blockKey}]},
      {
        type: 'insert',
        path: [{_key: otherBlockKey}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
            markDefs: [],
          },
        ],
      },
    ])
    expect(
      mapPoint(steps, {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 1,
      }),
    ).toEqual(null)
  })
})

describe(interpretTransaction.name, () => {
  test('a whole-node set invalidates old points even when only keys change', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const newBlockKey = keyGenerator()
    const newSpanKey = keyGenerator()
    const base = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const steps = interpretTransaction(base, [
      {
        type: 'set',
        path: [{_key: blockKey}],
        value: {
          _type: 'block',
          _key: newBlockKey,
          children: [{_type: 'span', _key: newSpanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      },
    ])
    expect(
      mapPoint(steps, {
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
        offset: 1,
      }),
    ).toEqual(null)
  })
})

test('resolving an index-addressed patch does not enumerate unrelated keys', () => {
  const keyGenerator = createTestKeyGenerator()
  const unusedKey = keyGenerator()
  let reads = 0
  const base = [
    {_type: 'block', children: []},
    {
      get _key() {
        reads++
        return unusedKey
      },
      _type: 'block',
      children: [],
    },
  ]
  expect(resolvePath(base, [0, 'children']).path).toEqual([0, 'children'])
  expect(reads).toEqual(0)
})

test('annotation data never survives as range text at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [{_type: 'span', _key: firstKey, text: 'foo', marks: []}],
      markDefs: [{_type: 'note', _key: firstKey, text: 'baz'}],
    },
    {
      _type: 'block',
      _key: secondKey,
      children: [{_type: 'span', _key: secondKey, text: 'bar', marks: []}],
    },
  ]
  const steps = interpretTransaction(value, [
    {type: 'unset', path: [{_key: blockKey}, 'children', {_key: firstKey}]},
    {
      type: 'set',
      path: [{_key: secondKey}, 'children', {_key: secondKey}, 'text'],
      value: '',
    },
  ])
  const range = {
    anchor: {path: [{_key: blockKey}, 'children', {_key: firstKey}], offset: 0},
    focus: {
      path: [{_key: secondKey}, 'children', {_key: secondKey}],
      offset: 3,
    },
  }
  expect(rangeSurvives(value, steps, range)).toEqual(false)
  expect(mapRangeInward(value, steps, range)).toEqual(null)
})

test('removed inline objects cannot pair with inserted span text at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {_type: 'mention', _key: firstKey, text: 'foo'},
        {_type: 'span', _key: secondKey, text: 'bar', marks: []},
      ],
    },
  ]
  expect(
    interpretTransaction(value, [
      {type: 'unset', path: [{_key: blockKey}, 'children', {_key: firstKey}]},
      {
        type: 'insert',
        path: [{_key: blockKey}, 'children', {_key: secondKey}],
        position: 'before',
        items: [{_type: 'span', _key: objectKey, text: 'foo', marks: []}],
      },
    ]),
  ).toEqual([
    {
      type: 'remove.node',
      path: [{_key: blockKey}, 'children', {_key: firstKey}],
    },
  ])
})

test('annotation data never survives as range text at four containers', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                      ],
                      markDefs: [{_type: 'note', _key: firstKey, text: 'baz'}],
                    },
                    {
                      _type: 'block',
                      _key: secondKey,
                      children: [
                        {
                          _type: 'span',
                          _key: secondKey,
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'unset',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
    },
    {
      type: 'set',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: secondKey},
        'children',
        {_key: secondKey},
        'text',
      ],
      value: '',
    },
  ])
  const range = {
    anchor: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: secondKey},
        'children',
        {_key: secondKey},
      ],
      offset: 3,
    },
  }
  expect(rangeSurvives(value, steps, range)).toEqual(false)
  expect(mapRangeInward(value, steps, range)).toEqual(null)
})

test('removed inline objects cannot pair with inserted span text at four containers', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        {_type: 'mention', _key: firstKey, text: 'foo'},
                        {
                          _type: 'span',
                          _key: secondKey,
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  expect(
    interpretTransaction(value, [
      {
        type: 'unset',
        path: [
          {_key: calloutKey},
          'content',
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: firstKey},
        ],
      },
      {
        type: 'insert',
        path: [
          {_key: calloutKey},
          'content',
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: secondKey},
        ],
        position: 'before',
        items: [{_type: 'span', _key: objectKey, text: 'foo', marks: []}],
      },
    ]),
  ).toEqual([
    {
      type: 'remove.node',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
    },
  ])
})

test('annotation data never survives as range text at object field', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: firstKey, text: 'foo', marks: []}],
            markDefs: [{_type: 'note', _key: firstKey, text: 'baz'}],
          },
          {
            _type: 'block',
            _key: secondKey,
            children: [
              {_type: 'span', _key: secondKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'unset',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
    },
    {
      type: 'set',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: secondKey},
        'children',
        {_key: secondKey},
        'text',
      ],
      value: '',
    },
  ])
  const range = {
    anchor: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
      offset: 0,
    },
    focus: {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: secondKey},
        'children',
        {_key: secondKey},
      ],
      offset: 3,
    },
  }
  expect(rangeSurvives(value, steps, range)).toEqual(false)
  expect(mapRangeInward(value, steps, range)).toEqual(null)
})

test('removed inline objects cannot pair with inserted span text at object field', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'mention', _key: firstKey, text: 'foo'},
              {_type: 'span', _key: secondKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  expect(
    interpretTransaction(value, [
      {
        type: 'unset',
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: firstKey},
        ],
      },
      {
        type: 'insert',
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: secondKey},
        ],
        position: 'before',
        items: [{_type: 'span', _key: objectKey, text: 'foo', marks: []}],
      },
    ]),
  ).toEqual([
    {
      type: 'remove.node',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        {_key: firstKey},
      ],
    },
  ])
})

test('interprets a root rekey across 5000 nested object fields', () => {
  const keyGenerator = createTestKeyGenerator()
  const rootKey = keyGenerator()
  const replacementKey = keyGenerator()
  let nested: unknown = {text: 'foo'}
  for (let depth = 0; depth < 5000; depth++) {
    nested = {content: nested}
  }
  const value = [{_type: 'object', _key: rootKey, content: nested}]
  expect(
    interpretTransaction(value, [
      {type: 'set', path: [{_key: rootKey}, '_key'], value: replacementKey},
    ]),
  ).toEqual([
    {type: 'set.key', path: [{_key: rootKey}], newKey: replacementKey},
  ])
})

test('insert shifts missing span addresses at root across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', text: 'foo', marks: []},
        {_type: 'span', text: 'bar', marks: []},
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [{_key: blockKey}, 'children', 0],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {path: [{_key: blockKey}, 'children', 4], offset: 1}),
  ).toEqual({path: [{_key: blockKey}, 'children', 5], offset: 1})
})

test('remove shifts missing span addresses at root across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', text: 'foo', marks: []},
        {_type: 'span', text: 'bar', marks: []},
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {type: 'unset', path: [{_key: blockKey}, 'children', 0]},
  ])
  expect(
    mapPoint(steps, {path: [{_key: blockKey}, 'children', 4], offset: 1}),
  ).toEqual({path: [{_key: blockKey}, 'children', 3], offset: 1})
})

test('insert shifts empty span addresses at root across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: '', text: 'foo', marks: []},
        {_type: 'span', _key: '', text: 'bar', marks: []},
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [{_key: blockKey}, 'children', 0],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {path: [{_key: blockKey}, 'children', 4], offset: 1}),
  ).toEqual({path: [{_key: blockKey}, 'children', 5], offset: 1})
})

test('remove shifts empty span addresses at root across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: '', text: 'foo', marks: []},
        {_type: 'span', _key: '', text: 'bar', marks: []},
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {type: 'unset', path: [{_key: blockKey}, 'children', 0]},
  ])
  expect(
    mapPoint(steps, {path: [{_key: blockKey}, 'children', 4], offset: 1}),
  ).toEqual({path: [{_key: blockKey}, 'children', 3], offset: 1})
})

test('insert shifts duplicate span addresses at root across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [{_key: blockKey}, 'children', 0],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {path: [{_key: blockKey}, 'children', 4], offset: 1}),
  ).toEqual({path: [{_key: blockKey}, 'children', 5], offset: 1})
})

test('remove shifts duplicate span addresses at root across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        null,
        'foo',
        1,
        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {type: 'unset', path: [{_key: blockKey}, 'children', 0]},
  ])
  expect(
    mapPoint(steps, {path: [{_key: blockKey}, 'children', 4], offset: 1}),
  ).toEqual({path: [{_key: blockKey}, 'children', 3], offset: 1})
})

test('insert shifts missing span addresses at four containers across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', text: 'foo', marks: []},
                        {_type: 'span', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        0,
      ],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: calloutKey},
      'content',
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      5,
    ],
    offset: 1,
  })
})

test('remove shifts missing span addresses at four containers across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', text: 'foo', marks: []},
                        {_type: 'span', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'unset',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        0,
      ],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: calloutKey},
      'content',
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      3,
    ],
    offset: 1,
  })
})

test('insert shifts empty span addresses at four containers across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: '', text: 'foo', marks: []},
                        {_type: 'span', _key: '', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        0,
      ],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: calloutKey},
      'content',
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      5,
    ],
    offset: 1,
  })
})

test('remove shifts empty span addresses at four containers across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: '', text: 'foo', marks: []},
                        {_type: 'span', _key: '', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'unset',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        0,
      ],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: calloutKey},
      'content',
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      3,
    ],
    offset: 1,
  })
})

test('insert shifts duplicate span addresses at four containers across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        0,
      ],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: calloutKey},
      'content',
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      5,
    ],
    offset: 1,
  })
})

test('remove shifts duplicate span addresses at four containers across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'span', _key: firstKey, text: 'foo', marks: []},
                        {_type: 'span', _key: firstKey, text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'unset',
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        0,
      ],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: calloutKey},
        'content',
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: calloutKey},
      'content',
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      3,
    ],
    offset: 1,
  })
})

test('insert shifts missing span addresses at object field across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', text: 'foo', marks: []},
              {_type: 'span', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        0,
      ],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: objectKey},
      'details',
      'body',
      {_key: blockKey},
      'children',
      5,
    ],
    offset: 1,
  })
})

test('remove shifts missing span addresses at object field across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', text: 'foo', marks: []},
              {_type: 'span', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'unset',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        0,
      ],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: objectKey},
      'details',
      'body',
      {_key: blockKey},
      'children',
      3,
    ],
    offset: 1,
  })
})

test('insert shifts empty span addresses at object field across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: '', text: 'foo', marks: []},
              {_type: 'span', _key: '', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        0,
      ],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: objectKey},
      'details',
      'body',
      {_key: blockKey},
      'children',
      5,
    ],
    offset: 1,
  })
})

test('remove shifts empty span addresses at object field across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: '', text: 'foo', marks: []},
              {_type: 'span', _key: '', text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'unset',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        0,
      ],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: objectKey},
      'details',
      'body',
      {_key: blockKey},
      'children',
      3,
    ],
    offset: 1,
  })
})

test('insert shifts duplicate span addresses at object field across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'span', _key: firstKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        0,
      ],
      position: 'before',
      items: [1],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: objectKey},
      'details',
      'body',
      {_key: blockKey},
      'children',
      5,
    ],
    offset: 1,
  })
})

test('remove shifts duplicate span addresses at object field across non-object siblings', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              null,
              'foo',
              1,
              {_type: 'span', _key: firstKey, text: 'foo', marks: []},
              {_type: 'span', _key: firstKey, text: 'bar', marks: []},
            ],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'unset',
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        0,
      ],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: objectKey},
        'details',
        'body',
        {_key: blockKey},
        'children',
        4,
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: objectKey},
      'details',
      'body',
      {_key: blockKey},
      'children',
      3,
    ],
    offset: 1,
  })
})

test('text field edits on inline objects and annotations emit no text steps at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      markDefs: [{_type: 'note', _key: firstKey, text: 'foo'}],
      children: [
        null,
        'foo',
        1,
        {_type: 'mention', _key: secondKey, text: 'bar'},
      ],
    },
  ]
  expect(
    interpretTransaction(value, [
      {
        type: 'set',
        path: [{_key: blockKey}, 'markDefs', {_key: firstKey}, 'text'],
        value: 'baz',
      },
      {
        type: 'set',
        path: [{_key: blockKey}, 'children', {_key: secondKey}, 'text'],
        value: 'foo',
      },
      {
        type: 'unset',
        path: [{_key: blockKey}, 'markDefs', {_key: firstKey}, 'text'],
      },
      {
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: secondKey}, 'text'],
      },
    ]),
  ).toEqual([])
})

test('text field edits on inline objects and annotations emit no text steps at four containers', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      markDefs: [{_type: 'note', _key: firstKey, text: 'foo'}],
                      children: [
                        null,
                        'foo',
                        1,
                        {_type: 'mention', _key: secondKey, text: 'bar'},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  expect(
    interpretTransaction(value, [
      {
        type: 'set',
        path: [
          {_key: calloutKey},
          'content',
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          {_key: blockKey},
          'markDefs',
          {_key: firstKey},
          'text',
        ],
        value: 'baz',
      },
      {
        type: 'set',
        path: [
          {_key: calloutKey},
          'content',
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: secondKey},
          'text',
        ],
        value: 'foo',
      },
      {
        type: 'unset',
        path: [
          {_key: calloutKey},
          'content',
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          {_key: blockKey},
          'markDefs',
          {_key: firstKey},
          'text',
        ],
      },
      {
        type: 'unset',
        path: [
          {_key: calloutKey},
          'content',
          {_key: tableKey},
          'rows',
          {_key: rowKey},
          'cells',
          {_key: cellKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: secondKey},
          'text',
        ],
      },
    ]),
  ).toEqual([])
})

test('text field edits on inline objects and annotations emit no text steps at object field', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstKey = keyGenerator()
  const secondKey = keyGenerator()
  const objectKey = keyGenerator()
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            markDefs: [{_type: 'note', _key: firstKey, text: 'foo'}],
            children: [
              null,
              'foo',
              1,
              {_type: 'mention', _key: secondKey, text: 'bar'},
            ],
          },
        ],
      },
    },
  ]
  expect(
    interpretTransaction(value, [
      {
        type: 'set',
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'markDefs',
          {_key: firstKey},
          'text',
        ],
        value: 'baz',
      },
      {
        type: 'set',
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: secondKey},
          'text',
        ],
        value: 'foo',
      },
      {
        type: 'unset',
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'markDefs',
          {_key: firstKey},
          'text',
        ],
      },
      {
        type: 'unset',
        path: [
          {_key: objectKey},
          'details',
          'body',
          {_key: blockKey},
          'children',
          {_key: secondKey},
          'text',
        ],
      },
    ]),
  ).toEqual([])
})

test('resolving an index at four containers does not read unrelated keys', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const calloutKey = keyGenerator()
  const tableKey = keyGenerator()
  const rowKey = keyGenerator()
  const cellKey = keyGenerator()
  const unusedKey = keyGenerator()
  let reads = 0
  const value = [
    {
      _type: 'callout',
      _key: calloutKey,
      content: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: blockKey,
                      children: [
                        {content: []},
                        {
                          get _key() {
                            reads++
                            return unusedKey
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  expect(
    resolvePath(value, [
      {_key: calloutKey},
      'content',
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      0,
      'content',
    ]).value,
  ).toEqual([])
  expect(reads).toEqual(0)
})

test('resolving an index at object field does not read unrelated keys', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const objectKey = keyGenerator()
  const unusedKey = keyGenerator()
  let reads = 0
  const value = [
    {
      _type: 'object',
      _key: objectKey,
      details: {
        body: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {content: []},
              {
                get _key() {
                  reads++
                  return unusedKey
                },
              },
            ],
          },
        ],
      },
    },
  ]
  expect(
    resolvePath(value, [
      {_key: objectKey},
      'details',
      'body',
      {_key: blockKey},
      'children',
      0,
      'content',
    ]).value,
  ).toEqual([])
  expect(reads).toEqual(0)
})

test('reuses array key counts across text replay and schema classification', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const spanKey = keyGenerator()
  let keyReads = 0
  const base = keys.map((key) => ({
    _type: 'block',
    get _key() {
      keyReads++
      return key
    },
    children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
  }))
  expect(
    interpretTransaction(
      base,
      keys.map((key) => ({
        type: 'set',
        path: [{_key: key}, 'children', {_key: spanKey}, 'text'],
        value: 'bar',
      })),
    ),
  ).toEqual([
    {
      type: 'set.text',
      path: [{_key: 'k0'}, 'children', {_key: 'k8'}],
      length: 3,
    },
    {
      type: 'set.text',
      path: [{_key: 'k1'}, 'children', {_key: 'k8'}],
      length: 3,
    },
    {
      type: 'set.text',
      path: [{_key: 'k2'}, 'children', {_key: 'k8'}],
      length: 3,
    },
    {
      type: 'set.text',
      path: [{_key: 'k3'}, 'children', {_key: 'k8'}],
      length: 3,
    },
    {
      type: 'set.text',
      path: [{_key: 'k4'}, 'children', {_key: 'k8'}],
      length: 3,
    },
    {
      type: 'set.text',
      path: [{_key: 'k5'}, 'children', {_key: 'k8'}],
      length: 3,
    },
    {
      type: 'set.text',
      path: [{_key: 'k6'}, 'children', {_key: 'k8'}],
      length: 3,
    },
    {
      type: 'set.text',
      path: [{_key: 'k7'}, 'children', {_key: 'k8'}],
      length: 3,
    },
  ])
  expect(keyReads).toEqual(24)
})

test('discards a replacement removed after its parent shifts', () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const base = [
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          _key: key0,
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
    },
  ]
  const patches: Patch[] = [
    {
      type: 'insert',
      path: [
        0,
        'children',
        {
          _key: key0,
        },
      ],
      position: 'replace',
      items: [
        {
          _type: 'span',
          _key: key0,
          text: 'bar',
          marks: [],
        },
      ],
    },
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [
        {
          _type: 'block',
          children: [],
          markDefs: [],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        1,
        'children',
        {
          _key: key0,
        },
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as PortableTextBlock[],
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'remove.node',
      path: [
        0,
        'children',
        {
          _key: 'k0',
        },
      ],
    },
    {
      type: 'insert.node',
      path: [0],
      count: 1,
    },
    {
      type: 'remove.node',
      path: [
        1,
        'children',
        {
          _key: 'k0',
        },
      ],
    },
  ])
  expect(
    mapPoint(steps, {path: [0, 'children', {_key: 'k0'}], offset: 1}),
  ).toEqual(null)
})
test('discards a nested insertion removed after its owner is renamed', () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const base = [
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'x0x',
          marks: [],
          _key: '',
        },
        'str',
      ],
      markDefs: [],
      _key: key0,
    },
    {
      _type: 'obj',
      details: {
        body: [
          {
            _type: 'callout',
            content: [
              {
                _type: 'block',
                children: [
                  {
                    _type: 'span',
                    text: 'x2x',
                    marks: [],
                    _key: key1,
                  },
                  {
                    _type: 'span',
                    text: 'x4x',
                    marks: [],
                    _key: key2,
                  },
                  {
                    _type: 'span',
                    text: 'x6x',
                    marks: [],
                    _key: key3,
                  },
                ],
                markDefs: [],
              },
            ],
            _key: key3,
          },
        ],
      },
      _key: key4,
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'x8x',
          marks: [],
          _key: key5,
        },
        {
          _type: 'span',
          text: 'x10x',
          marks: [],
          _key: '',
        },
        {
          _type: 'span',
          text: 'x11x',
          marks: [],
          _key: '',
        },
      ],
      markDefs: [],
    },
  ]
  const patches: Patch[] = [
    {
      type: 'insert',
      path: [-3],
      position: 'after',
      items: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'x12x',
              marks: [],
            },
          ],
          markDefs: [],
          _key: key6,
        },
      ],
    },
    {
      type: 'unset',
      path: [-1],
    },
    {
      type: 'unset',
      path: [
        {
          _key: key4,
        },
        'details',
        'body',
        {
          _key: key3,
        },
      ],
    },
    {
      type: 'insert',
      path: [-1, 'details', 'body', -1],
      position: 'after',
      items: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'x14x',
              marks: [],
            },
          ],
          markDefs: [],
          _key: key3,
        },
      ],
    },
    {
      type: 'set',
      path: [
        {
          _key: key4,
        },
        '_key',
      ],
      value: '',
    },
    {
      type: 'unset',
      path: [2, 'details', 'body', 0],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as PortableTextBlock[],
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'insert.node',
      path: [1],
      count: 1,
    },
    {
      type: 'remove.node',
      path: [3],
    },
    {
      type: 'remove.node',
      path: [
        {
          _key: 'k4',
        },
        'details',
        'body',
        {
          _key: 'k3',
        },
      ],
    },
    {
      type: 'move.node',
      from: [
        {
          _key: 'k4',
        },
      ],
      to: [2],
    },
    {
      type: 'remove.node',
      path: [
        2,
        'details',
        'body',
        {
          _key: 'k3',
        },
      ],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: key4},
        'details',
        'body',
        {_key: key3},
        'content',
        0,
        'children',
        {_key: key1},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})
test('discards a span replacement removed after root insertions and removals', () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const base = [
    null,
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'x0x',
          marks: [],
          _key: key0,
        },
        {
          _type: 'span',
          text: 'x2x',
          marks: [],
          _key: key1,
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'x3x',
          marks: [],
        },
        {
          _type: 'span',
          text: 'x4x',
          marks: [],
          _key: key2,
        },
      ],
      markDefs: [],
      _key: key3,
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'x7x',
          marks: [],
          _key: key4,
        },
        {
          _type: 'span',
          text: 'x9x',
          marks: [],
        },
      ],
      markDefs: [
        {
          _type: 'note',
          _key: key5,
          text: 'note',
        },
      ],
      _key: key6,
    },
  ]
  const patches: Patch[] = [
    {
      type: 'insert',
      path: [
        -3,
        'children',
        {
          _key: key0,
        },
      ],
      position: 'replace',
      items: [
        {
          _type: 'span',
          text: 'x11x',
          marks: [],
          _key: key0,
        },
      ],
    },
    {
      type: 'insert',
      path: [1],
      position: 'before',
      items: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'x12x',
              marks: [],
              _key: key7,
            },
            {
              _type: 'span',
              text: 'x14x',
              marks: [],
              _key: key8,
            },
            {
              _type: 'span',
              text: 'x16x',
              marks: [],
              _key: key9,
            },
          ],
          markDefs: [],
          _key: '',
        },
      ],
    },
    {
      type: 'unset',
      path: [4],
    },
    {
      type: 'unset',
      path: [
        -2,
        'children',
        {
          _key: key0,
        },
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as PortableTextBlock[],
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'remove.node',
      path: [
        1,
        'children',
        {
          _key: 'k0',
        },
      ],
    },
    {
      type: 'insert.node',
      path: [1],
      count: 1,
    },
    {
      type: 'remove.node',
      path: [
        {
          _key: 'k6',
        },
      ],
    },
    {
      type: 'remove.node',
      path: [
        2,
        'children',
        {
          _key: 'k0',
        },
      ],
    },
  ])
  expect(
    mapPoint(steps, {path: [1, 'children', {_key: 'k0'}], offset: 1}),
  ).toEqual(null)
})
test('discards a nested replacement after an ancestor sibling is removed', () => {
  const keyGenerator = createTestKeyGenerator()
  const key0 = keyGenerator()
  const key1 = keyGenerator()
  const key2 = keyGenerator()
  const key3 = keyGenerator()
  const key4 = keyGenerator()
  const key5 = keyGenerator()
  const key6 = keyGenerator()
  const key7 = keyGenerator()
  const key8 = keyGenerator()
  const key9 = keyGenerator()
  const key10 = keyGenerator()
  const key11 = keyGenerator()
  const key12 = keyGenerator()
  const base = [
    {
      _type: 'callout',
      content: [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'x0x',
              marks: [],
            },
            {
              _type: 'span',
              text: 'x1x',
              marks: [],
              _key: key0,
            },
            {
              _type: 'span',
              text: 'x2x',
              marks: [],
              _key: key1,
            },
          ],
          markDefs: [],
          _key: key0,
        },
        {
          _type: 'obj',
          details: {
            body: [
              {
                _type: 'callout',
                content: [
                  {
                    _type: 'block',
                    children: [
                      {
                        _type: 'span',
                        text: 'x4x',
                        marks: [],
                        _key: key0,
                      },
                    ],
                    markDefs: [],
                    _key: key2,
                  },
                  'str',
                  {
                    _type: 'block',
                    children: [3],
                    markDefs: [
                      {
                        _type: 'note',
                        _key: key3,
                        text: 'note',
                      },
                    ],
                    _key: key4,
                  },
                ],
                _key: key5,
              },
            ],
          },
          _key: key6,
        },
        {
          _type: 'callout',
          content: [
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  text: 'x9x',
                  marks: [],
                  _key: key6,
                },
              ],
              markDefs: [],
              _key: key0,
            },
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  text: 'x10x',
                  marks: [],
                  _key: key0,
                },
              ],
              markDefs: [],
              _key: key0,
            },
            'str',
          ],
          _key: key6,
        },
      ],
      _key: '',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'x11x',
          marks: [],
          _key: key7,
        },
        {
          _type: 'span',
          text: 'x13x',
          marks: [],
          _key: key8,
        },
      ],
      markDefs: [
        {
          _type: 'note',
          _key: key9,
          text: 'note',
        },
      ],
      _key: '',
    },
    {
      _type: 'block',
      children: [
        {
          _type: 'span',
          text: 'x16x',
          marks: [],
          _key: key10,
        },
        {
          _type: 'span',
          text: 'x18x',
          marks: [],
          _key: key0,
        },
        {
          _type: 'span',
          text: 'x19x',
          marks: [],
          _key: key11,
        },
      ],
      markDefs: [],
      _key: key12,
    },
  ]
  const patches: Patch[] = [
    {
      type: 'insert',
      path: [
        {
          _key: '',
        },
        'content',
        2,
        'content',
        1,
        'children',
        0,
      ],
      position: 'replace',
      items: [
        {
          _type: 'mention',
          text: '@m22',
          _key: key6,
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {
          _key: '',
        },
        'content',
        {
          _key: key0,
        },
      ],
    },
    {
      type: 'set',
      path: [2, 'style'],
      value: 'h1',
    },
    {
      type: 'unset',
      path: [
        {
          _key: '',
        },
        'content',
        1,
        'content',
        -2,
        'children',
        0,
      ],
    },
    {
      type: 'insert',
      path: [
        0,
        'content',
        {
          _key: key6,
        },
        'details',
        'body',
        -1,
        'content',
        0,
        'children',
        -1,
      ],
      position: 'after',
      items: [
        {
          _type: 'span',
          text: 'x23x',
          marks: [],
          _key: '',
        },
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as PortableTextBlock[],
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'remove.node',
      path: [
        0,
        'content',
        2,
        'content',
        1,
        'children',
        {
          _key: 'k0',
        },
      ],
    },
    {
      type: 'remove.node',
      path: [
        0,
        'content',
        {
          _key: 'k0',
        },
      ],
      index: 0,
    },
    {
      type: 'remove.node',
      path: [
        0,
        'content',
        1,
        'content',
        1,
        'children',
        {
          _key: 'k6',
        },
      ],
    },
    {
      type: 'insert.node',
      path: [
        0,
        'content',
        0,
        'details',
        'body',
        {
          _key: 'k5',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        1,
      ],
      count: 1,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [0, 'content', 2, 'content', 1, 'children', {_key: key0}],
      offset: 1,
    }),
  ).toEqual(null)
})

test('maps insert-first move indices at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 9}, () => keyGenerator())
  const base = [
    {
      _type: 'block',
      _key: keys[0]!,
      children: [
        {
          _type: 'span',
          _key: keys[1]!,
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'callout',
      content: [
        {
          _type: 'block',
          _key: keys[2]!,
          children: [
            {
              _type: 'span',
              _key: keys[3]!,
              text: 'bar',
              marks: [],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              _key: keys[4]!,
              text: 'baz',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {
      type: 'insert',
      path: [1, 'content', {_key: keys[2]!}],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    },
    {type: 'unset', path: [{_key: keys[0]!}]},
  ])
  expect(steps).toEqual([
    {
      type: 'move.node',
      from: [{_key: 'k0'}],
      to: [0, 'content', {_key: 'k0'}],
      fromIndex: 0,
      toIndex: 1,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
      offset: 1,
    }),
  ).toEqual({
    path: [0, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 1,
  })
  expect(
    mapPoint(steps, {
      path: [1, 'content', 1, 'children', {_key: keys[4]!}],
      offset: 2,
    }),
  ).toEqual({path: [0, 'content', 2, 'children', {_key: 'k4'}], offset: 2})
})

test('maps insert-first move indices in a callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 9}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[5]!,
      content: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [
            {
              _type: 'span',
              _key: keys[1]!,
              text: 'foo',
              marks: [],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'callout',
          content: [
            {
              _type: 'block',
              _key: keys[2]!,
              children: [
                {
                  _type: 'span',
                  _key: keys[3]!,
                  text: 'bar',
                  marks: [],
                },
              ],
              markDefs: [],
            },
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  _key: keys[4]!,
                  text: 'baz',
                  marks: [],
                },
              ],
              markDefs: [],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {
      type: 'insert',
      path: [{_key: keys[5]!}, 'content', 1, 'content', {_key: keys[2]!}],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    },
    {type: 'unset', path: [{_key: keys[5]!}, 'content', {_key: keys[0]!}]},
  ])
  expect(steps).toEqual([
    {
      type: 'move.node',
      from: [{_key: 'k5'}, 'content', {_key: 'k0'}],
      to: [{_key: 'k5'}, 'content', 0, 'content', {_key: 'k0'}],
      fromIndex: 0,
      toIndex: 1,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[5]!},
        'content',
        {_key: keys[0]!},
        'children',
        {_key: keys[1]!},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: 'k5'},
      'content',
      0,
      'content',
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
    ],
    offset: 1,
  })
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[5]!},
        'content',
        1,
        'content',
        1,
        'children',
        {_key: keys[4]!},
      ],
      offset: 2,
    }),
  ).toEqual({
    path: [{_key: 'k5'}, 'content', 0, 'content', 2, 'children', {_key: 'k4'}],
    offset: 2,
  })
})

test('maps insert-first move indices in a callout table cell', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 9}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[5]!,
      content: [
        {
          _type: 'table',
          _key: keys[6]!,
          rows: [
            {
              _type: 'row',
              _key: keys[7]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[8]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[0]!,
                      children: [
                        {
                          _type: 'span',
                          _key: keys[1]!,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                    },
                    {
                      _type: 'callout',
                      content: [
                        {
                          _type: 'block',
                          _key: keys[2]!,
                          children: [
                            {
                              _type: 'span',
                              _key: keys[3]!,
                              text: 'bar',
                              marks: [],
                            },
                          ],
                          markDefs: [],
                        },
                        {
                          _type: 'block',
                          children: [
                            {
                              _type: 'span',
                              _key: keys[4]!,
                              text: 'baz',
                              marks: [],
                            },
                          ],
                          markDefs: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {
      type: 'insert',
      path: [
        {_key: keys[5]!},
        'content',
        {_key: keys[6]!},
        'rows',
        {_key: keys[7]!},
        'cells',
        {_key: keys[8]!},
        'content',
        1,
        'content',
        {_key: keys[2]!},
      ],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {_key: keys[5]!},
        'content',
        {_key: keys[6]!},
        'rows',
        {_key: keys[7]!},
        'cells',
        {_key: keys[8]!},
        'content',
        {_key: keys[0]!},
      ],
    },
  ])
  expect(steps).toEqual([
    {
      type: 'move.node',
      from: [
        {_key: 'k5'},
        'content',
        {_key: 'k6'},
        'rows',
        {_key: 'k7'},
        'cells',
        {_key: 'k8'},
        'content',
        {_key: 'k0'},
      ],
      to: [
        {_key: 'k5'},
        'content',
        {_key: 'k6'},
        'rows',
        {_key: 'k7'},
        'cells',
        {_key: 'k8'},
        'content',
        0,
        'content',
        {_key: 'k0'},
      ],
      fromIndex: 0,
      toIndex: 1,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[5]!},
        'content',
        {_key: keys[6]!},
        'rows',
        {_key: keys[7]!},
        'cells',
        {_key: keys[8]!},
        'content',
        {_key: keys[0]!},
        'children',
        {_key: keys[1]!},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: 'k5'},
      'content',
      {_key: 'k6'},
      'rows',
      {_key: 'k7'},
      'cells',
      {_key: 'k8'},
      'content',
      0,
      'content',
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
    ],
    offset: 1,
  })
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[5]!},
        'content',
        {_key: keys[6]!},
        'rows',
        {_key: keys[7]!},
        'cells',
        {_key: keys[8]!},
        'content',
        1,
        'content',
        1,
        'children',
        {_key: keys[4]!},
      ],
      offset: 2,
    }),
  ).toEqual({
    path: [
      {_key: 'k5'},
      'content',
      {_key: 'k6'},
      'rows',
      {_key: 'k7'},
      'cells',
      {_key: 'k8'},
      'content',
      0,
      'content',
      2,
      'children',
      {_key: 'k4'},
    ],
    offset: 2,
  })
})

test('maps insert-first move indices in an object field', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 9}, () => keyGenerator())
  const base = [
    {
      _type: 'object',
      _key: keys[5]!,
      details: {
        body: [
          {
            _type: 'block',
            _key: keys[0]!,
            children: [
              {
                _type: 'span',
                _key: keys[1]!,
                text: 'foo',
                marks: [],
              },
            ],
            markDefs: [],
          },
          {
            _type: 'callout',
            content: [
              {
                _type: 'block',
                _key: keys[2]!,
                children: [
                  {
                    _type: 'span',
                    _key: keys[3]!,
                    text: 'bar',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
              {
                _type: 'block',
                children: [
                  {
                    _type: 'span',
                    _key: keys[4]!,
                    text: 'baz',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {
      type: 'insert',
      path: [
        {_key: keys[5]!},
        'details',
        'body',
        1,
        'content',
        {_key: keys[2]!},
      ],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    },
    {
      type: 'unset',
      path: [{_key: keys[5]!}, 'details', 'body', {_key: keys[0]!}],
    },
  ])
  expect(steps).toEqual([
    {
      type: 'move.node',
      from: [{_key: 'k5'}, 'details', 'body', {_key: 'k0'}],
      to: [{_key: 'k5'}, 'details', 'body', 0, 'content', {_key: 'k0'}],
      fromIndex: 0,
      toIndex: 1,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[5]!},
        'details',
        'body',
        {_key: keys[0]!},
        'children',
        {_key: keys[1]!},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: 'k5'},
      'details',
      'body',
      0,
      'content',
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
    ],
    offset: 1,
  })
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[5]!},
        'details',
        'body',
        1,
        'content',
        1,
        'children',
        {_key: keys[4]!},
      ],
      offset: 2,
    }),
  ).toEqual({
    path: [
      {_key: 'k5'},
      'details',
      'body',
      0,
      'content',
      2,
      'children',
      {_key: 'k4'},
    ],
    offset: 2,
  })
})

test('does not classify a block-shaped annotation as text', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const annotationKey = keyGenerator()
  const spanKey = keyGenerator()
  const base = [
    {
      _type: 'block',
      _key: blockKey,
      children: [],
      markDefs: [
        {
          _type: 'block',
          _key: annotationKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ],
    },
  ]
  expect(
    interpretTransaction(base as unknown as PortableTextBlock[], [
      {
        type: 'set',
        path: [
          {_key: blockKey},
          'markDefs',
          {_key: annotationKey},
          'children',
          {_key: spanKey},
          'text',
        ],
        value: 'bar',
      },
    ]),
  ).toEqual([])
})

test('maps unset-first move indices at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 9}, () => keyGenerator())
  const base = [
    {
      _type: 'block',
      _key: keys[0]!,
      children: [
        {
          _type: 'span',
          _key: keys[1]!,
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'callout',
      content: [
        {
          _type: 'block',
          _key: keys[2]!,
          children: [
            {
              _type: 'span',
              _key: keys[3]!,
              text: 'bar',
              marks: [],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              _key: keys[4]!,
              text: 'baz',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {type: 'unset', path: [{_key: keys[0]!}]},
    {
      type: 'insert',
      path: [0, 'content', {_key: keys[2]!}],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    },
  ])
  expect(steps).toEqual([
    {
      type: 'move.node',
      from: [{_key: 'k0'}],
      to: [0, 'content', {_key: 'k0'}],
      fromIndex: 0,
      toIndex: 1,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [{_key: keys[0]!}, 'children', {_key: keys[1]!}],
      offset: 1,
    }),
  ).toEqual({
    path: [0, 'content', {_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 1,
  })
  expect(
    mapPoint(steps, {
      path: [1, 'content', 1, 'children', {_key: keys[4]!}],
      offset: 2,
    }),
  ).toEqual({path: [0, 'content', 2, 'children', {_key: 'k4'}], offset: 2})
})

test('maps unset-first move indices in a callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 9}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[5]!,
      content: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [
            {
              _type: 'span',
              _key: keys[1]!,
              text: 'foo',
              marks: [],
            },
          ],
          markDefs: [],
        },
        {
          _type: 'callout',
          content: [
            {
              _type: 'block',
              _key: keys[2]!,
              children: [
                {
                  _type: 'span',
                  _key: keys[3]!,
                  text: 'bar',
                  marks: [],
                },
              ],
              markDefs: [],
            },
            {
              _type: 'block',
              children: [
                {
                  _type: 'span',
                  _key: keys[4]!,
                  text: 'baz',
                  marks: [],
                },
              ],
              markDefs: [],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {type: 'unset', path: [{_key: keys[5]!}, 'content', {_key: keys[0]!}]},
    {
      type: 'insert',
      path: [{_key: keys[5]!}, 'content', 0, 'content', {_key: keys[2]!}],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    },
  ])
  expect(steps).toEqual([
    {
      type: 'move.node',
      from: [{_key: 'k5'}, 'content', {_key: 'k0'}],
      to: [{_key: 'k5'}, 'content', 0, 'content', {_key: 'k0'}],
      fromIndex: 0,
      toIndex: 1,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[5]!},
        'content',
        {_key: keys[0]!},
        'children',
        {_key: keys[1]!},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: 'k5'},
      'content',
      0,
      'content',
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
    ],
    offset: 1,
  })
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[5]!},
        'content',
        1,
        'content',
        1,
        'children',
        {_key: keys[4]!},
      ],
      offset: 2,
    }),
  ).toEqual({
    path: [{_key: 'k5'}, 'content', 0, 'content', 2, 'children', {_key: 'k4'}],
    offset: 2,
  })
})

test('declines a self-nested copy with a keyless child at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'block',
          children: [{_type: 'span', _key: keys[1]!, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    },
    {
      _type: 'block',
      children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
      markDefs: [],
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {
      type: 'insert',
      path: [{_key: keys[0]!}, 'content', 0],
      position: 'after',
      items: [
        {
          _type: 'callout',
          _key: keys[0]!,
          content: [
            {
              _type: 'block',
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
      ],
    },
    {type: 'unset', path: [{_key: keys[0]!}]},
  ])
  expect(steps).toEqual([
    {type: 'insert.node', path: [{_key: keys[0]!}, 'content', 1], count: 1},
    {
      type: 'move.node',
      from: [{_key: keys[0]!}, 'content', 0, 'children', {_key: keys[1]!}],
      to: [
        {_key: keys[0]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
    },
    {type: 'remove.node', path: [{_key: keys[0]!}], index: 0},
  ])
  expect(
    mapPoint(steps, {
      path: [{_key: keys[0]!}, 'content', 0, 'children', {_key: keys[1]!}],
      offset: 1,
    }),
  ).toEqual(null)
  expect(
    mapPoint(steps, {path: [1, 'children', {_key: keys[3]!}], offset: 1}),
  ).toEqual({path: [0, 'children', {_key: keys[3]!}], offset: 1})
})

test('declines a self-nested copy with a keyless child at callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[4]!,
      content: [
        {
          _type: 'callout',
          _key: keys[0]!,
          content: [
            {
              _type: 'block',
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
        {
          _type: 'block',
          children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
          markDefs: [],
        },
      ],
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {
      type: 'insert',
      path: [{_key: keys[4]!}, 'content', {_key: keys[0]!}, 'content', 0],
      position: 'after',
      items: [
        {
          _type: 'callout',
          _key: keys[0]!,
          content: [
            {
              _type: 'block',
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
      ],
    },
    {type: 'unset', path: [{_key: keys[4]!}, 'content', {_key: keys[0]!}]},
  ])
  expect(steps).toEqual([
    {
      type: 'insert.node',
      path: [{_key: keys[4]!}, 'content', {_key: keys[0]!}, 'content', 1],
      count: 1,
    },
    {
      type: 'move.node',
      from: [
        {_key: keys[4]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
      to: [
        {_key: keys[4]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
    },
    {
      type: 'remove.node',
      path: [{_key: keys[4]!}, 'content', {_key: keys[0]!}],
      index: 0,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[4]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
  expect(
    mapPoint(steps, {
      path: [{_key: keys[4]!}, 'content', 1, 'children', {_key: keys[3]!}],
      offset: 1,
    }),
  ).toEqual({
    path: [{_key: keys[4]!}, 'content', 0, 'children', {_key: keys[3]!}],
    offset: 1,
  })
})

test('declines a self-nested copy with a keyless child at table cell', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[4]!,
      content: [
        {
          _type: 'table',
          _key: keys[5]!,
          rows: [
            {
              _type: 'row',
              _key: keys[6]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[7]!,
                  content: [
                    {
                      _type: 'callout',
                      _key: keys[0]!,
                      content: [
                        {
                          _type: 'block',
                          children: [
                            {
                              _type: 'span',
                              _key: keys[1]!,
                              text: 'foo',
                              marks: [],
                            },
                          ],
                          markDefs: [],
                        },
                      ],
                    },
                    {
                      _type: 'block',
                      children: [
                        {_type: 'span', _key: keys[3]!, text: 'bar', marks: []},
                      ],
                      markDefs: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {
      type: 'insert',
      path: [
        {_key: keys[4]!},
        'content',
        {_key: keys[5]!},
        'rows',
        {_key: keys[6]!},
        'cells',
        {_key: keys[7]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
      ],
      position: 'after',
      items: [
        {
          _type: 'callout',
          _key: keys[0]!,
          content: [
            {
              _type: 'block',
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {_key: keys[4]!},
        'content',
        {_key: keys[5]!},
        'rows',
        {_key: keys[6]!},
        'cells',
        {_key: keys[7]!},
        'content',
        {_key: keys[0]!},
      ],
    },
  ])
  expect(steps).toEqual([
    {
      type: 'insert.node',
      path: [
        {_key: keys[4]!},
        'content',
        {_key: keys[5]!},
        'rows',
        {_key: keys[6]!},
        'cells',
        {_key: keys[7]!},
        'content',
        {_key: keys[0]!},
        'content',
        1,
      ],
      count: 1,
    },
    {
      type: 'move.node',
      from: [
        {_key: keys[4]!},
        'content',
        {_key: keys[5]!},
        'rows',
        {_key: keys[6]!},
        'cells',
        {_key: keys[7]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
      to: [
        {_key: keys[4]!},
        'content',
        {_key: keys[5]!},
        'rows',
        {_key: keys[6]!},
        'cells',
        {_key: keys[7]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
    },
    {
      type: 'remove.node',
      path: [
        {_key: keys[4]!},
        'content',
        {_key: keys[5]!},
        'rows',
        {_key: keys[6]!},
        'cells',
        {_key: keys[7]!},
        'content',
        {_key: keys[0]!},
      ],
      index: 0,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[4]!},
        'content',
        {_key: keys[5]!},
        'rows',
        {_key: keys[6]!},
        'cells',
        {_key: keys[7]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[4]!},
        'content',
        {_key: keys[5]!},
        'rows',
        {_key: keys[6]!},
        'cells',
        {_key: keys[7]!},
        'content',
        1,
        'children',
        {_key: keys[3]!},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: keys[4]!},
      'content',
      {_key: keys[5]!},
      'rows',
      {_key: keys[6]!},
      'cells',
      {_key: keys[7]!},
      'content',
      0,
      'children',
      {_key: keys[3]!},
    ],
    offset: 1,
  })
})

test('declines a self-nested copy with a keyless child at object field', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 8}, () => keyGenerator())
  const base = [
    {
      _type: 'object',
      _key: keys[4]!,
      details: {
        body: [
          {
            _type: 'callout',
            _key: keys[0]!,
            content: [
              {
                _type: 'block',
                children: [
                  {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
                ],
                markDefs: [],
              },
            ],
          },
          {
            _type: 'block',
            children: [{_type: 'span', _key: keys[3]!, text: 'bar', marks: []}],
            markDefs: [],
          },
        ],
      },
    },
  ]
  const steps = interpretTransaction(base as unknown as PortableTextBlock[], [
    {
      type: 'insert',
      path: [
        {_key: keys[4]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        0,
      ],
      position: 'after',
      items: [
        {
          _type: 'callout',
          _key: keys[0]!,
          content: [
            {
              _type: 'block',
              children: [
                {_type: 'span', _key: keys[1]!, text: 'foo', marks: []},
              ],
              markDefs: [],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [{_key: keys[4]!}, 'details', 'body', {_key: keys[0]!}],
    },
  ])
  expect(steps).toEqual([
    {
      type: 'insert.node',
      path: [
        {_key: keys[4]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        1,
      ],
      count: 1,
    },
    {
      type: 'move.node',
      from: [
        {_key: keys[4]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
      to: [
        {_key: keys[4]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
    },
    {
      type: 'remove.node',
      path: [{_key: keys[4]!}, 'details', 'body', {_key: keys[0]!}],
      index: 0,
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[4]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        0,
        'children',
        {_key: keys[1]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[4]!},
        'details',
        'body',
        1,
        'children',
        {_key: keys[3]!},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [
      {_key: keys[4]!},
      'details',
      'body',
      0,
      'children',
      {_key: keys[3]!},
    ],
    offset: 1,
  })
})

test('preserves removal after an inner-container rename at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[2]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        '_key',
      ],
      value: keys[5]!,
    },
    {type: 'unset', path: [{_key: keys[0]!}, 'content', {_key: keys[1]!}]},
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[5]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [{_key: keys[1]!}, 'content', 0, 'content', {_key: keys[3]!}],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'content', {_key: 'k2'}],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [{_key: 'k0'}, 'content', {_key: 'k1'}],
      to: [{_key: 'k1'}],
    },
    {
      type: 'remove.node',
      path: [{_key: 'k1'}, 'content', {_key: 'k5'}, 'content', {_key: 'k3'}],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        {_key: keys[4]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('preserves removal after a moved-container rename at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[2]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [{_key: keys[0]!}, 'content', {_key: keys[1]!}, '_key'],
      value: keys[5]!,
    },
    {type: 'unset', path: [{_key: keys[0]!}, 'content', {_key: keys[5]!}]},
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[2]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [{_key: keys[5]!}, 'content', 0, 'content', {_key: keys[3]!}],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [{_key: 'k0'}, 'content', {_key: 'k5'}],
      to: [{_key: 'k5'}],
    },
    {
      type: 'remove.node',
      path: [{_key: 'k5'}, 'content', {_key: 'k2'}, 'content', {_key: 'k3'}],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        {_key: keys[4]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('preserves removal after an inner-container rename at callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[6]!,
      content: [
        {
          _type: 'callout',
          _key: keys[0]!,
          content: [
            {
              _type: 'callout',
              _key: keys[1]!,
              content: [
                {
                  _type: 'callout',
                  _key: keys[2]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        '_key',
      ],
      value: keys[5]!,
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
      ],
    },
    {
      type: 'insert',
      path: [{_key: keys[6]!}, 'content', 0],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[5]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[1]!},
        'content',
        0,
        'content',
        {_key: keys[3]!},
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'content',
        {_key: 'k2'},
      ],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [{_key: 'k6'}, 'content', {_key: 'k0'}, 'content', {_key: 'k1'}],
      to: [{_key: 'k6'}, 'content', {_key: 'k1'}],
    },
    {
      type: 'remove.node',
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k1'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k3'},
      ],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        {_key: keys[4]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('preserves removal after a moved-container rename at callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[6]!,
      content: [
        {
          _type: 'callout',
          _key: keys[0]!,
          content: [
            {
              _type: 'callout',
              _key: keys[1]!,
              content: [
                {
                  _type: 'callout',
                  _key: keys[2]!,
                  content: [
                    {
                      _type: 'block',
                      _key: keys[3]!,
                      children: [
                        {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        '_key',
      ],
      value: keys[5]!,
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[5]!},
      ],
    },
    {
      type: 'insert',
      path: [{_key: keys[6]!}, 'content', 0],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[2]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[5]!},
        'content',
        0,
        'content',
        {_key: keys[3]!},
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [{_key: 'k6'}, 'content', {_key: 'k0'}, 'content', {_key: 'k1'}],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [{_key: 'k6'}, 'content', {_key: 'k0'}, 'content', {_key: 'k5'}],
      to: [{_key: 'k6'}, 'content', {_key: 'k5'}],
    },
    {
      type: 'remove.node',
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k2'},
        'content',
        {_key: 'k3'},
      ],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        {_key: keys[4]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('preserves removal after an inner-container rename at table cell', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[6]!,
      content: [
        {
          _type: 'table',
          _key: keys[7]!,
          rows: [
            {
              _type: 'row',
              _key: keys[8]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[9]!,
                  content: [
                    {
                      _type: 'callout',
                      _key: keys[0]!,
                      content: [
                        {
                          _type: 'callout',
                          _key: keys[1]!,
                          content: [
                            {
                              _type: 'callout',
                              _key: keys[2]!,
                              content: [
                                {
                                  _type: 'block',
                                  _key: keys[3]!,
                                  children: [
                                    {
                                      _type: 'span',
                                      _key: keys[4]!,
                                      text: 'foo',
                                      marks: [],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        '_key',
      ],
      value: keys[5]!,
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
      ],
    },
    {
      type: 'insert',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        0,
      ],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[5]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        {_key: keys[1]!},
        'content',
        0,
        'content',
        {_key: keys[3]!},
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k7'},
        'rows',
        {_key: 'k8'},
        'cells',
        {_key: 'k9'},
        'content',
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'content',
        {_key: 'k2'},
      ],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [
        {_key: 'k6'},
        'content',
        {_key: 'k7'},
        'rows',
        {_key: 'k8'},
        'cells',
        {_key: 'k9'},
        'content',
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
      ],
      to: [
        {_key: 'k6'},
        'content',
        {_key: 'k7'},
        'rows',
        {_key: 'k8'},
        'cells',
        {_key: 'k9'},
        'content',
        {_key: 'k1'},
      ],
    },
    {
      type: 'remove.node',
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k7'},
        'rows',
        {_key: 'k8'},
        'cells',
        {_key: 'k9'},
        'content',
        {_key: 'k1'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k3'},
      ],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        {_key: keys[4]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('preserves removal after a moved-container rename at table cell', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[6]!,
      content: [
        {
          _type: 'table',
          _key: keys[7]!,
          rows: [
            {
              _type: 'row',
              _key: keys[8]!,
              cells: [
                {
                  _type: 'cell',
                  _key: keys[9]!,
                  content: [
                    {
                      _type: 'callout',
                      _key: keys[0]!,
                      content: [
                        {
                          _type: 'callout',
                          _key: keys[1]!,
                          content: [
                            {
                              _type: 'callout',
                              _key: keys[2]!,
                              content: [
                                {
                                  _type: 'block',
                                  _key: keys[3]!,
                                  children: [
                                    {
                                      _type: 'span',
                                      _key: keys[4]!,
                                      text: 'foo',
                                      marks: [],
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        '_key',
      ],
      value: keys[5]!,
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[5]!},
      ],
    },
    {
      type: 'insert',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        0,
      ],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[2]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        {_key: keys[5]!},
        'content',
        0,
        'content',
        {_key: keys[3]!},
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k7'},
        'rows',
        {_key: 'k8'},
        'cells',
        {_key: 'k9'},
        'content',
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
      ],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [
        {_key: 'k6'},
        'content',
        {_key: 'k7'},
        'rows',
        {_key: 'k8'},
        'cells',
        {_key: 'k9'},
        'content',
        {_key: 'k0'},
        'content',
        {_key: 'k5'},
      ],
      to: [
        {_key: 'k6'},
        'content',
        {_key: 'k7'},
        'rows',
        {_key: 'k8'},
        'cells',
        {_key: 'k9'},
        'content',
        {_key: 'k5'},
      ],
    },
    {
      type: 'remove.node',
      path: [
        {_key: 'k6'},
        'content',
        {_key: 'k7'},
        'rows',
        {_key: 'k8'},
        'cells',
        {_key: 'k9'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k2'},
        'content',
        {_key: 'k3'},
      ],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[6]!},
        'content',
        {_key: keys[7]!},
        'rows',
        {_key: keys[8]!},
        'cells',
        {_key: keys[9]!},
        'content',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        {_key: keys[4]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('preserves removal after an inner-container rename at object field', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'object',
      _key: keys[6]!,
      details: {
        body: [
          {
            _type: 'callout',
            _key: keys[0]!,
            content: [
              {
                _type: 'callout',
                _key: keys[1]!,
                content: [
                  {
                    _type: 'callout',
                    _key: keys[2]!,
                    content: [
                      {
                        _type: 'block',
                        _key: keys[3]!,
                        children: [
                          {
                            _type: 'span',
                            _key: keys[4]!,
                            text: 'foo',
                            marks: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {_key: keys[6]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        '_key',
      ],
      value: keys[5]!,
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
      ],
    },
    {
      type: 'insert',
      path: [{_key: keys[6]!}, 'details', 'body', 0],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[5]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'details',
        'body',
        {_key: keys[1]!},
        'content',
        0,
        'content',
        {_key: keys[3]!},
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [
        {_key: 'k6'},
        'details',
        'body',
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
        'content',
        {_key: 'k2'},
      ],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [
        {_key: 'k6'},
        'details',
        'body',
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
      ],
      to: [{_key: 'k6'}, 'details', 'body', {_key: 'k1'}],
    },
    {
      type: 'remove.node',
      path: [
        {_key: 'k6'},
        'details',
        'body',
        {_key: 'k1'},
        'content',
        {_key: 'k5'},
        'content',
        {_key: 'k3'},
      ],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[6]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        {_key: keys[4]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('preserves removal after a moved-container rename at object field', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'object',
      _key: keys[6]!,
      details: {
        body: [
          {
            _type: 'callout',
            _key: keys[0]!,
            content: [
              {
                _type: 'callout',
                _key: keys[1]!,
                content: [
                  {
                    _type: 'callout',
                    _key: keys[2]!,
                    content: [
                      {
                        _type: 'block',
                        _key: keys[3]!,
                        children: [
                          {
                            _type: 'span',
                            _key: keys[4]!,
                            text: 'foo',
                            marks: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {_key: keys[6]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        '_key',
      ],
      value: keys[5]!,
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        {_key: keys[5]!},
      ],
    },
    {
      type: 'insert',
      path: [{_key: keys[6]!}, 'details', 'body', 0],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[5]!,
          content: [
            {
              _type: 'callout',
              _key: keys[2]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {_type: 'span', _key: keys[4]!, text: 'foo', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {_key: keys[6]!},
        'details',
        'body',
        {_key: keys[5]!},
        'content',
        0,
        'content',
        {_key: keys[3]!},
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [
        {_key: 'k6'},
        'details',
        'body',
        {_key: 'k0'},
        'content',
        {_key: 'k1'},
      ],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [
        {_key: 'k6'},
        'details',
        'body',
        {_key: 'k0'},
        'content',
        {_key: 'k5'},
      ],
      to: [{_key: 'k6'}, 'details', 'body', {_key: 'k5'}],
    },
    {
      type: 'remove.node',
      path: [
        {_key: 'k6'},
        'details',
        'body',
        {_key: 'k5'},
        'content',
        {_key: 'k2'},
        'content',
        {_key: 'k3'},
      ],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[6]!},
        'details',
        'body',
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        {_key: keys[4]!},
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('preserves removal after an inner-container rename at root with a keyless span', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 10}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[2]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [{_type: 'span', text: 'foo', marks: []}],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        '_key',
      ],
      value: keys[5]!,
    },
    {type: 'unset', path: [{_key: keys[0]!}, 'content', {_key: keys[1]!}]},
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[5]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [{_type: 'span', text: 'foo', marks: []}],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [{_key: keys[1]!}, 'content', 0, 'content', {_key: keys[3]!}],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(steps).toEqual([
    {
      type: 'set.key',
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'content', {_key: 'k2'}],
      newKey: 'k5',
    },
    {
      type: 'move.node',
      from: [{_key: 'k0'}, 'content', {_key: 'k1'}],
      to: [{_key: 'k1'}],
    },
    {
      type: 'remove.node',
      path: [{_key: 'k1'}, 'content', {_key: 'k5'}, 'content', {_key: 'k3'}],
    },
  ] satisfies Array<Step>)
  expect(
    mapPoint(steps, {
      path: [
        {_key: keys[0]!},
        'content',
        {_key: keys[1]!},
        'content',
        {_key: keys[2]!},
        'content',
        {_key: keys[3]!},
        'children',
        0,
      ],
      offset: 1,
    }),
  ).toEqual(null)
})

test('moves an end caret with text merged by Backspace at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const base = [
    {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keys[1]!,
          text: 'foo',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: keys[2]!,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keys[3]!,
          text: 'bar',
          marks: [],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'unset',
      path: [
        {
          _key: keys[2]!,
        },
      ],
      origin: 'local',
    },
    {
      type: 'set',
      path: [
        {
          _key: keys[0]!,
        },
        'markDefs',
      ],
      value: [],
      origin: 'local',
    },
    {
      type: 'setIfMissing',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
      ],
      value: [],
      origin: 'local',
    },
    {
      type: 'insert',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[1]!,
        },
      ],
      position: 'after',
      items: [
        {
          _key: keys[4]!,
          _type: 'span',
          marks: [],
          text: '',
        },
      ],
      origin: 'local',
    },
    {
      type: 'setIfMissing',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
      ],
      value: [],
      origin: 'local',
    },
    {
      type: 'insert',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[1]!,
        },
      ],
      position: 'after',
      items: [
        {
          _type: 'span',
          _key: keys[3]!,
          text: 'bar',
          marks: [],
        },
      ],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[1]!,
        },
        'text',
      ],
      value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      origin: 'local',
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[3]!,
        },
      ],
      origin: 'local',
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[4]!,
        },
      ],
      origin: 'local',
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[2]!,
        },
        'children',
        {
          _key: keys[3]!,
        },
      ],
      offset: 3,
    }),
  ).toEqual({
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
  })
})

test('moves an end caret with text merged by Backspace in a callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'block',
          _key: keys[1]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'foo',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          _key: keys[3]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[4]!,
              text: 'bar',
              marks: [],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[3]!,
        },
      ],
      origin: 'local',
    },
    {
      type: 'set',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'markDefs',
      ],
      value: [],
      origin: 'local',
    },
    {
      type: 'setIfMissing',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
      ],
      value: [],
      origin: 'local',
    },
    {
      type: 'insert',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
      ],
      position: 'after',
      items: [
        {
          _key: keys[5]!,
          _type: 'span',
          marks: [],
          text: '',
        },
      ],
      origin: 'local',
    },
    {
      type: 'setIfMissing',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
      ],
      value: [],
      origin: 'local',
    },
    {
      type: 'insert',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
      ],
      position: 'after',
      items: [
        {
          _type: 'span',
          _key: keys[4]!,
          text: 'bar',
          marks: [],
        },
      ],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
        'text',
      ],
      value: '@@ -1,3 +1,6 @@\n foo\n+bar\n',
      origin: 'local',
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[4]!,
        },
      ],
      origin: 'local',
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[5]!,
        },
      ],
      origin: 'local',
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[3]!,
        },
        'children',
        {
          _key: keys[4]!,
        },
      ],
      offset: 3,
    }),
  ).toEqual({
    path: [
      {
        _key: 'k0',
      },
      'content',
      {
        _key: 'k1',
      },
      'children',
      {
        _key: 'k2',
      },
    ],
    offset: 6,
  })
})

test('moves an end caret with a span merged after removing its decorator at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 4}, () => keyGenerator())
  const base = [
    {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keys[1]!,
          text: 'foo ',
          marks: [],
        },
        {
          _type: 'span',
          _key: keys[2]!,
          text: 'bar',
          marks: ['strong'],
        },
        {
          _type: 'span',
          _key: keys[3]!,
          text: ' baz',
          marks: [],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
        'marks',
      ],
      value: [],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[1]!,
        },
        'text',
      ],
      value: '@@ -1,4 +1,7 @@\n foo \n+bar\n',
      origin: 'local',
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
      ],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[1]!,
        },
        'text',
      ],
      value: '@@ -1,7 +1,11 @@\n foo bar\n+ baz\n',
      origin: 'local',
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[3]!,
        },
      ],
      origin: 'local',
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
      ],
      offset: 3,
    }),
  ).toEqual({
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
  })
})

test('moves an end caret with a span merged after removing its decorator in a callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 5}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'block',
          _key: keys[1]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'foo ',
              marks: [],
            },
            {
              _type: 'span',
              _key: keys[3]!,
              text: 'bar',
              marks: ['strong'],
            },
            {
              _type: 'span',
              _key: keys[4]!,
              text: ' baz',
              marks: [],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[3]!,
        },
        'marks',
      ],
      value: [],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
        'text',
      ],
      value: '@@ -1,4 +1,7 @@\n foo \n+bar\n',
      origin: 'local',
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[3]!,
        },
      ],
      origin: 'local',
    },
    {
      type: 'diffMatchPatch',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
        'text',
      ],
      value: '@@ -1,7 +1,11 @@\n foo bar\n+ baz\n',
      origin: 'local',
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[4]!,
        },
      ],
      origin: 'local',
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[3]!,
        },
      ],
      offset: 3,
    }),
  ).toEqual({
    path: [
      {
        _key: 'k0',
      },
      'content',
      {
        _key: 'k1',
      },
      'children',
      {
        _key: 'k2',
      },
    ],
    offset: 7,
  })
})

test('moves a caret past the split point with the trailing text at root', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 3}, () => keyGenerator())
  const base = [
    {
      _type: 'block',
      _key: keys[0]!,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keys[1]!,
          text: 'foo bar baz',
          marks: [],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'diffMatchPatch',
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[1]!,
        },
        'text',
      ],
      value: '@@ -1,11 +1,4 @@\n foo \n-bar baz\n',
      origin: 'local',
    },
    {
      type: 'insert',
      path: [
        {
          _key: keys[0]!,
        },
      ],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[2]!,
          children: [
            {
              _type: 'span',
              _key: keys[1]!,
              text: 'bar baz',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      origin: 'local',
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[1]!,
        },
      ],
      offset: 11,
    }),
  ).toEqual({
    path: [
      {
        _key: 'k2',
      },
      'children',
      {
        _key: 'k1',
      },
    ],
    offset: 7,
  })
})

test('moves a caret past the split point with the trailing text in a callout', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 4}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'block',
          _key: keys[1]!,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'foo bar baz',
              marks: [],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'diffMatchPatch',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
        'text',
      ],
      value: '@@ -1,11 +1,4 @@\n foo \n-bar baz\n',
      origin: 'local',
    },
    {
      type: 'insert',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
      ],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[3]!,
          children: [
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'bar baz',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      origin: 'local',
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
      ],
      offset: 11,
    }),
  ).toEqual({
    path: [
      {
        _key: 'k0',
      },
      'content',
      {
        _key: 'k3',
      },
      'children',
      {
        _key: 'k2',
      },
    ],
    offset: 7,
  })
})

test('removes a caret after renaming and moving its ancestor', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 6}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[2]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                      _key: keys[4]!,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'content',
        {
          _key: keys[2]!,
        },
        '_key',
      ],
      value: keys[5]!,
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
      ],
    },
    {
      type: 'insert',
      path: [
        {
          _key: keys[0]!,
        },
      ],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'callout',
              _key: keys[5]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[3]!,
                  children: [
                    {
                      _type: 'span',
                      text: 'foo',
                      _key: keys[4]!,
                      marks: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[1]!,
        },
        'content',
        {
          _key: keys[5]!,
        },
        'content',
        {
          _key: keys[3]!,
        },
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'content',
        {
          _key: keys[2]!,
        },
        'content',
        {
          _key: keys[3]!,
        },
        'children',
        0,
      ],
      offset: 2,
    }),
  ).toEqual(null)
})

test('preserves text beside an inner removal after renaming and reinserting its ancestor', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 7}, () => keyGenerator())
  const base = [
    {
      _type: 'callout',
      _key: keys[0]!,
      content: [
        {
          _type: 'callout',
          _key: keys[1]!,
          content: [
            {
              _type: 'block',
              _key: keys[2]!,
              children: [
                {
                  _type: 'span',
                  _key: keys[3]!,
                  text: 'foo',
                },
              ],
            },
            {
              _type: 'block',
              _key: keys[4]!,
              children: [
                {
                  _type: 'span',
                  _key: keys[5]!,
                  text: 'bar',
                },
              ],
            },
          ],
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'set',
      path: [
        {
          _key: keys[0]!,
        },
        '_key',
      ],
      value: keys[6]!,
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[6]!,
        },
      ],
    },
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [
        {
          _type: 'callout',
          _key: keys[6]!,
          content: [
            {
              _type: 'callout',
              _key: keys[1]!,
              content: [
                {
                  _type: 'block',
                  _key: keys[2]!,
                  children: [
                    {
                      _type: 'span',
                      _key: keys[3]!,
                      text: 'foo',
                    },
                  ],
                },
                {
                  _type: 'block',
                  _key: keys[4]!,
                  children: [
                    {
                      _type: 'span',
                      _key: keys[5]!,
                      text: 'bar',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        {
          _key: keys[6]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'content',
        {
          _key: keys[2]!,
        },
      ],
    },
    {
      type: 'set',
      path: [
        {
          _key: keys[6]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'content',
        {
          _key: keys[4]!,
        },
        'children',
        {
          _key: keys[5]!,
        },
        'marks',
      ],
      value: [],
    },
    {
      type: 'set',
      path: [
        {
          _key: keys[6]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'content',
        {
          _key: keys[4]!,
        },
        'markDefs',
      ],
      value: [],
    },
    {
      type: 'set',
      path: [
        {
          _key: keys[6]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'content',
        {
          _key: keys[4]!,
        },
        'style',
      ],
      value: 'normal',
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[0]!,
        },
        'content',
        {
          _key: keys[1]!,
        },
        'content',
        {
          _key: keys[4]!,
        },
        'children',
        {
          _key: keys[5]!,
        },
      ],
      offset: 2,
    }),
  ).toEqual({
    path: [
      {
        _key: 'k6',
      },
      'content',
      {
        _key: 'k1',
      },
      'content',
      {
        _key: 'k4',
      },
      'children',
      {
        _key: 'k5',
      },
    ],
    offset: 2,
  })
})

test('maps a caret to null when a block is reinserted twice under the same key', () => {
  const keyGenerator = createTestKeyGenerator()
  const keys = Array.from({length: 3}, () => keyGenerator())
  const base = [
    {
      _type: 'block',
      _key: keys[0]!,
      children: [
        {
          _type: 'span',
          _key: keys[1]!,
          text: 'bar',
        },
        {
          _type: 'span',
          _key: keys[2]!,
          text: 'baz',
        },
      ],
    },
  ]
  const patches: Array<Patch> = [
    {
      type: 'unset',
      path: [
        {
          _key: keys[0]!,
        },
      ],
    },
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [
            {
              _type: 'span',
              _key: keys[1]!,
              text: 'bar',
            },
            {
              _type: 'span',
              _key: keys[2]!,
              text: 'baz',
            },
          ],
        },
      ],
    },
    {
      type: 'insert',
      path: [0],
      position: 'after',
      items: [
        {
          _type: 'block',
          _key: keys[0]!,
          children: [],
        },
      ],
    },
    {
      type: 'unset',
      path: [
        0,
        'children',
        {
          _key: keys[2]!,
        },
      ],
    },
    {
      type: 'insert',
      path: [
        0,
        'children',
        {
          _key: keys[1]!,
        },
      ],
      position: 'after',
      items: [
        {
          _type: 'span',
          _key: keys[2]!,
          text: 'baz',
        },
      ],
    },
  ]
  const steps = interpretTransaction(
    base as unknown as Array<PortableTextBlock>,
    patches,
  )
  expect(
    mapPoint(steps, {
      path: [
        {
          _key: keys[0]!,
        },
        'children',
        {
          _key: keys[2]!,
        },
      ],
      offset: 2,
    }),
  ).toEqual(null)
})

test('maps a removed block to null after its keyless root container shifts', () => {
  const keyGenerator = createTestKeyGenerator()
  const innerKey = keyGenerator()
  const removedBlockKey = keyGenerator()
  const removedSpanKey = keyGenerator()
  const survivingBlockKey = keyGenerator()
  const survivingSpanKey = keyGenerator()
  const insertedBlockKey = keyGenerator()
  const insertedSpanKey = keyGenerator()
  const inner = {
    _type: 'callout',
    _key: innerKey,
    content: [
      {
        _type: 'block',
        _key: removedBlockKey,
        children: [
          {_type: 'span', _key: removedSpanKey, text: 'foo', marks: []},
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: survivingBlockKey,
        children: [
          {_type: 'span', _key: survivingSpanKey, text: 'bar', marks: []},
        ],
        markDefs: [],
      },
    ],
  }
  const insertedBlock = {
    _type: 'block',
    _key: insertedBlockKey,
    children: [{_type: 'span', _key: insertedSpanKey, text: 'baz', marks: []}],
    markDefs: [],
  }
  const value = [{_type: 'callout', content: [inner]}]
  const steps = interpretTransaction(
    value as unknown as Array<PortableTextBlock>,
    [
      {type: 'insert', path: [0], position: 'before', items: [insertedBlock]},
      {type: 'unset', path: [1, 'content', {_key: innerKey}]},
      {
        type: 'insert',
        path: [{_key: insertedBlockKey}],
        position: 'after',
        items: [inner],
      },
      {
        type: 'unset',
        path: [{_key: innerKey}, 'content', {_key: removedBlockKey}],
      },
    ],
  )
  expect(
    mapPoint(steps, {
      path: [
        0,
        'content',
        {_key: innerKey},
        'content',
        {_key: removedBlockKey},
        'children',
        {_key: removedSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual(null)
  expect(
    mapPoint(steps, {
      path: [
        0,
        'content',
        {_key: innerKey},
        'content',
        {_key: survivingBlockKey},
        'children',
        {_key: survivingSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [{_key: 'k0'}, 'content', {_key: 'k3'}, 'children', {_key: 'k4'}],
    offset: 1,
  })
})
test('maps a removed block to null after its empty-key root container shifts', () => {
  const keyGenerator = createTestKeyGenerator()
  const innerKey = keyGenerator()
  const removedBlockKey = keyGenerator()
  const removedSpanKey = keyGenerator()
  const survivingBlockKey = keyGenerator()
  const survivingSpanKey = keyGenerator()
  const insertedBlockKey = keyGenerator()
  const insertedSpanKey = keyGenerator()
  const inner = {
    _type: 'callout',
    _key: innerKey,
    content: [
      {
        _type: 'block',
        _key: removedBlockKey,
        children: [
          {_type: 'span', _key: removedSpanKey, text: 'foo', marks: []},
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: survivingBlockKey,
        children: [
          {_type: 'span', _key: survivingSpanKey, text: 'bar', marks: []},
        ],
        markDefs: [],
      },
    ],
  }
  const insertedBlock = {
    _type: 'block',
    _key: insertedBlockKey,
    children: [{_type: 'span', _key: insertedSpanKey, text: 'baz', marks: []}],
    markDefs: [],
  }
  const value = [{_type: 'callout', _key: '', content: [inner]}]
  const steps = interpretTransaction(value, [
    {type: 'insert', path: [0], position: 'before', items: [insertedBlock]},
    {type: 'unset', path: [1, 'content', {_key: innerKey}]},
    {
      type: 'insert',
      path: [{_key: insertedBlockKey}],
      position: 'after',
      items: [inner],
    },
    {
      type: 'unset',
      path: [{_key: innerKey}, 'content', {_key: removedBlockKey}],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        0,
        'content',
        {_key: innerKey},
        'content',
        {_key: removedBlockKey},
        'children',
        {_key: removedSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual(null)
  expect(
    mapPoint(steps, {
      path: [
        0,
        'content',
        {_key: innerKey},
        'content',
        {_key: survivingBlockKey},
        'children',
        {_key: survivingSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [{_key: 'k0'}, 'content', {_key: 'k3'}, 'children', {_key: 'k4'}],
    offset: 1,
  })
})
test('maps a removed cell block to null after its keyless table row shifts', () => {
  const keyGenerator = createTestKeyGenerator()
  const innerKey = keyGenerator()
  const removedBlockKey = keyGenerator()
  const removedSpanKey = keyGenerator()
  const survivingBlockKey = keyGenerator()
  const survivingSpanKey = keyGenerator()
  const outerKey = keyGenerator()
  const inner = {
    _type: 'cell',
    _key: innerKey,
    content: [
      {
        _type: 'block',
        _key: removedBlockKey,
        children: [
          {_type: 'span', _key: removedSpanKey, text: 'foo', marks: []},
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: survivingBlockKey,
        children: [
          {_type: 'span', _key: survivingSpanKey, text: 'bar', marks: []},
        ],
        markDefs: [],
      },
    ],
  }
  const value = [
    {_type: 'table', _key: outerKey, rows: [{_type: 'row', cells: [inner]}]},
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [{_key: outerKey}, 'rows', 0],
      position: 'before',
      items: [{_type: 'row', cells: []}],
    },
    {
      type: 'unset',
      path: [{_key: outerKey}, 'rows', 1, 'cells', {_key: innerKey}],
    },
    {
      type: 'insert',
      path: [{_key: outerKey}],
      position: 'after',
      items: [inner],
    },
    {
      type: 'unset',
      path: [{_key: innerKey}, 'content', {_key: removedBlockKey}],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: outerKey},
        'rows',
        0,
        'cells',
        {_key: innerKey},
        'content',
        {_key: removedBlockKey},
        'children',
        {_key: removedSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual(null)
  expect(
    mapPoint(steps, {
      path: [
        {_key: outerKey},
        'rows',
        0,
        'cells',
        {_key: innerKey},
        'content',
        {_key: survivingBlockKey},
        'children',
        {_key: survivingSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [{_key: 'k0'}, 'content', {_key: 'k3'}, 'children', {_key: 'k4'}],
    offset: 1,
  })
})
test('maps a removed block to null after its keyless container two levels deep shifts', () => {
  const keyGenerator = createTestKeyGenerator()
  const innerKey = keyGenerator()
  const removedBlockKey = keyGenerator()
  const removedSpanKey = keyGenerator()
  const survivingBlockKey = keyGenerator()
  const survivingSpanKey = keyGenerator()
  const outerKey = keyGenerator()
  const inner = {
    _type: 'callout',
    _key: innerKey,
    content: [
      {
        _type: 'block',
        _key: removedBlockKey,
        children: [
          {_type: 'span', _key: removedSpanKey, text: 'foo', marks: []},
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: survivingBlockKey,
        children: [
          {_type: 'span', _key: survivingSpanKey, text: 'bar', marks: []},
        ],
        markDefs: [],
      },
    ],
  }
  const value = [
    {
      _type: 'callout',
      _key: outerKey,
      content: [{_type: 'callout', content: [inner]}],
    },
  ]
  const steps = interpretTransaction(value, [
    {
      type: 'insert',
      path: [{_key: outerKey}, 'content', 0],
      position: 'before',
      items: [{_type: 'callout', content: []}],
    },
    {
      type: 'unset',
      path: [{_key: outerKey}, 'content', 1, 'content', {_key: innerKey}],
    },
    {
      type: 'insert',
      path: [{_key: outerKey}],
      position: 'after',
      items: [inner],
    },
    {
      type: 'unset',
      path: [{_key: innerKey}, 'content', {_key: removedBlockKey}],
    },
  ])
  expect(
    mapPoint(steps, {
      path: [
        {_key: outerKey},
        'content',
        0,
        'content',
        {_key: innerKey},
        'content',
        {_key: removedBlockKey},
        'children',
        {_key: removedSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual(null)
  expect(
    mapPoint(steps, {
      path: [
        {_key: outerKey},
        'content',
        0,
        'content',
        {_key: innerKey},
        'content',
        {_key: survivingBlockKey},
        'children',
        {_key: survivingSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [{_key: 'k0'}, 'content', {_key: 'k3'}, 'children', {_key: 'k4'}],
    offset: 1,
  })
})

test('keeps a keyless span caret on its span when duplicate blocks reinsert a sibling', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const children: Array<JSONValue> = [
    {_type: 'span', _key: firstSpanKey, text: 'foo'},
    {_type: 'span', _key: secondSpanKey, text: 'bar'},
    {_type: 'span', text: 'baz'},
  ]
  const value = [{_type: 'block', _key: blockKey, children}]
  const steps = interpretTransaction(value, [
    {type: 'unset', path: [{_key: blockKey}]},
    {
      type: 'insert',
      path: [0],
      position: 'before',
      items: [{_type: 'block', _key: blockKey, children}],
    },
    {
      type: 'insert',
      path: [0],
      position: 'after',
      items: [{_type: 'block', _key: blockKey, children: []}],
    },
    {type: 'unset', path: [0, 'children', {_key: secondSpanKey}]},
    {
      type: 'insert',
      path: [0, 'children', {_key: firstSpanKey}],
      position: 'after',
      items: [{_type: 'span', _key: secondSpanKey, text: 'bar'}],
    },
  ])
  expect(
    mapPoint(steps, {path: [{_key: blockKey}, 'children', 2], offset: 1}),
  ).toEqual({path: [0, 'children', 2], offset: 1})
})

test('does not pair a renamed scratch block with a later insertion', () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const keylessSpanKey = keyGenerator()
  const lastBlockKey = keyGenerator()
  const lastSpanKey = keyGenerator()
  const scratchKey = keyGenerator()
  const scratchSpanKey = keyGenerator()
  const renamedKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: firstBlockKey,
      children: [{_type: 'span', _key: firstSpanKey, text: 'foo'}],
      markDefs: [],
    },
    {
      _type: 'block',
      children: [{_type: 'span', _key: keylessSpanKey, text: 'bar'}],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: lastBlockKey,
      children: [{_type: 'span', _key: lastSpanKey, text: 'baz'}],
      markDefs: [],
    },
  ]
  const steps = interpretTransaction(
    value as unknown as Array<PortableTextBlock>,
    [
      {
        type: 'insert',
        path: [{_key: firstBlockKey}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: scratchKey,
            children: [{_type: 'span', _key: scratchSpanKey, text: 'foo'}],
            markDefs: [],
          },
        ],
      },
      {type: 'set', path: [{_key: scratchKey}, '_key'], value: renamedKey},
      {type: 'unset', path: [{_key: renamedKey}]},
      {
        type: 'insert',
        path: [{_key: lastBlockKey}],
        position: 'after',
        items: [
          {
            _type: 'block',
            _key: renamedKey,
            children: [{_type: 'span', _key: scratchSpanKey, text: 'foo'}],
            markDefs: [],
          },
        ],
      },
    ],
  )
  expect(steps).toEqual([
    {type: 'insert.node', path: [1], count: 1},
    {type: 'set.key', path: [{_key: 'k5'}], newKey: 'k7'},
    {type: 'remove.node', path: [{_key: 'k7'}], index: 1},
    {type: 'insert.node', path: [3], count: 1},
  ])
})

test('moves a block out of a removed callout after an insert at an out-of-range index', () => {
  const keyGenerator = createTestKeyGenerator()
  const firstBlockKey = keyGenerator()
  const firstSpanKey = keyGenerator()
  const secondBlockKey = keyGenerator()
  const secondSpanKey = keyGenerator()
  const insertedBlockKey = keyGenerator()
  const insertedSpanKey = keyGenerator()
  const firstBlock = makeBlock(firstBlockKey, firstSpanKey, 'foo')
  const value = [
    {_type: 'callout', content: [firstBlock]},
    makeBlock(secondBlockKey, secondSpanKey, 'bar'),
  ]
  const steps = interpretTransaction(
    value as unknown as Array<PortableTextBlock>,
    [
      {
        type: 'insert',
        path: [-100],
        position: 'before',
        items: [makeBlock(insertedBlockKey, insertedSpanKey, 'baz')],
      },
      {type: 'insert', path: [1], position: 'after', items: [firstBlock]},
      {type: 'unset', path: [0]},
    ],
  )
  expect(steps).toEqual([
    {type: 'insert.node', path: [2], count: 1},
    {
      type: 'move.node',
      from: [0, 'content', {_key: 'k0'}],
      to: [{_key: 'k0'}],
    },
    {type: 'remove.node', path: [0]},
  ])
  expect(
    mapPoint(steps, {
      path: [
        0,
        'content',
        {_key: firstBlockKey},
        'children',
        {_key: firstSpanKey},
      ],
      offset: 1,
    }),
  ).toEqual({
    path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
    offset: 1,
  })
})
