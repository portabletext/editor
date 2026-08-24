import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import type {Patch} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  isTextBlock,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test} from 'vitest'
import {fromTextspec} from '../../test-utils/from-textspec'
import type {Path} from '../engine/interfaces/path'
import {mapPointThroughSteps, type Step} from '../engine/point/step-mapper'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getValue} from './get-value'
import {interpretTransaction} from './interpret-transaction'
import {safeParse} from './safe-json'

const wireCatalogueDir = join(
  __dirname,
  '../../tests/__fixtures__/wire-catalogue',
)

function readFixture(scenario: string): {
  seed: string | Array<PortableTextBlock>
  patches: Array<Patch>
} {
  return safeParse(
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
    ] satisfies Array<Step>)
  })

  test('Scenario: block-split-multi-span moves the two flanking spans by key, leaving the split span unpaired', () => {
    const fixture = readFixture('block-split-multi-span')
    const seed = seedFromTextspec(
      fixture.seed as string,
      defineSchema({decorators: [{name: 'strong'}]}),
    )

    const steps = interpretTransaction(seed, fixture.patches)

    // The split span's key reappears in the tail block (as the new
    // block's first child, holding the sliced-off remainder "o "), but
    // it's never removed: the head keeps the same key, trimmed in place
    // by a diffMatchPatch rather than unset, so it's never a candidate
    // identity-pairing looks up. No insertion candidate matches its text
    // alone either (the tail block's representative candidate reads the
    // whole block's concatenated text): it stays a plain `remove.text`,
    // degrading to the split boundary rather than crashing. The two
    // other spans are wholly unset then reappear, keys intact, as
    // children of the new tail block: `move.node` recognizes each one by
    // key, and it fully supersedes the strong span's clean `remove.node`
    // and the empty span's `remove.text`-then-`remove.node` pair alike,
    // so neither leaves a step behind to strand a point.
    expect(steps).toEqual([
      {
        type: 'remove.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 2,
        text: 'o ',
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

    // The tail block's first child reuses the split span's own key (k1),
    // but the head keeps that key too, untouched by any removal: a caret
    // sitting in the retained head text ("fo") stays exactly where it
    // was, not dragged into the reinserted duplicate.
    for (let offset = 0; offset <= 2; offset++) {
      expect(
        mapPointThroughSteps(steps, {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset,
        }),
      ).toEqual({path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset})
    }
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
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k5'}],
          offset: 0,
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
        text: ' foo',
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
        text: 'bar',
      },
    ] satisfies Array<Step>)
  })

  test('Scenario: span-merge-cosmetic folds the absorbed span in as one move, current text and all', () => {
    // The fixture's own seed carries two spans with identical (empty)
    // marks: textspec has no notation for a span boundary that isn't a
    // mark boundary (see `tests/wire-catalogue.test.tsx`), so this fixture
    // keeps its pre-textspec seed shape (full blocks) and is read as-is.
    const fixture = readFixture('span-merge-cosmetic')
    const seed = fixture.seed as Array<PortableTextBlock>

    const steps = interpretTransaction(seed, fixture.patches)

    // The removed span's local edit (typing '!') lands before its removal
    // reads the span's current text, so the move that pairs with that
    // removal carries all 4 characters, '!' included, in one hop; the raw
    // `insert.text` step for the '!' stays in the output; composed with the
    // move, it accounts for a point sitting exactly at the pre-existing
    // text's end, where the '!' was typed.
    expect(steps).toEqual([
      {
        type: 'insert.text',
        path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        offset: 3,
        text: '!',
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
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k2'}]},
    ] satisfies Array<Step>)
  })

  test('Scenario: block-merge-backspace chains two moves from the deleted block into the surviving span', () => {
    const fixture = readFixture('block-merge-backspace')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    // The wire capture moves the second block's span into the first block
    // (keys intact), then merges it into the first span (a second move),
    // then unsets the two now-empty leftover nodes.
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
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k3'}]},
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k6'}]},
    ] satisfies Array<Step>)
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
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k6'}],
          offset: 0,
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
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k4'}]},
    ] satisfies Array<Step>)
  })

  test('Scenario: block-move recognizes the reinserted block as a moved node, not a removal', () => {
    const fixture = readFixture('block-move')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    // The unset and the reinsert address the exact same block key: `move.text`
    // has nothing to add (there's no text to carry across, the path doesn't
    // even change), but the block's own key reappearing in the reinsert
    // means the block moved rather than died, so its interior carets survive
    // instead of being nulled by the unset's `remove.node`.
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
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 4,
          length: 3,
        },
        to: {
          path: [{_key: 'k0'}, 'children', {_key: 'k5'}],
          offset: 0,
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
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k3'}]},
    ] satisfies Array<Step>)
  })

  test('Scenario: insert-blocks-auto folds the scratch span into the target and leaves the pasted block alone', () => {
    const fixture = readFixture('insert-blocks-auto')
    const seed = seedFromTextspec(fixture.seed as string)

    const steps = interpretTransaction(seed, fixture.patches)

    // The scratch span created to hold "bar" while it's typed folds into
    // the target span (a move), and its now-empty sibling scratch span is
    // a plain removal; the pasted "baz" block is genuinely new content, so
    // it needs no point-mapping step of its own.
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
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k5'}]},
      {type: 'remove.node', path: [{_key: 'k0'}, 'children', {_key: 'k8'}]},
    ] satisfies Array<Step>)
  })
})

function spanPath(blockKey: string, spanKey: string): Path {
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

  /** Concatenate every span's text across every block, in document order. */
  function globalText(blocks: Array<PortableTextBlock>): string {
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
    caretPath: Path,
    caretOffset: number,
  ) {
    expect(globalText(resultBlocks)).toBe(seedText)

    const mapped = mapPointThroughSteps(steps, {
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

    // A tail shorter than two characters never pairs into a move (rule (a)
    // distrusts single-character text), so it's excluded from this sweep:
    // the point degrades to the split boundary instead, pinned separately
    // by the interpreter's own negative tests.
    for (
      let splitOffset = 0;
      splitOffset <= seedText.length - 2;
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

    // 11 split offsets (0..10, the ones whose tail is at least 2 characters)
    // x 13 caret positions (0..12): exhaustive over the small space rather
    // than randomly sampled, so the run is deterministic without a seeded
    // RNG.
    expect(cases).toBe(143)
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

    // The (start, end) ranges over 12 characters whose mid and (if any)
    // trailing remainder are both at least 2 characters, x 13 caret
    // positions: exhaustive over the small space, deterministic without a
    // seeded RNG.
    expect(cases).toBe(728)
  })
})

describe('interpretTransaction oracle: multi-span block splits (key-reappearance)', () => {
  type SpanSpec = {key: string; text: string; marks: Array<string>}

  /** Concatenate every span's text across every block, in document order. */
  function globalText(blocks: Array<PortableTextBlock>): string {
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
    caretPath: Path,
    caretOffset: number,
    globalCaretOffset: number,
  ) {
    expect(globalText(resultBlocks)).toBe(seedText)

    const mapped = mapPointThroughSteps(steps, {
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
          // trivially exact; spans at or after it (moved by `move.node`,
          // the fix under test) are asserted for full character identity.
          // Each span's offset is local to that span, so it's converted to
          // its global position in `seedText` before comparing: only the
          // first span in a layout has local and global offsets coincide.
          for (const [spanIndex, span] of spans.entries()) {
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

              if (spanIndex === splitSpanIndex && caretOffset > localOffset) {
                // The split span's key reappears in the tail (the new
                // node holds its sliced-off remainder there), but it's
                // never removed: the head keeps the same key, trimmed in
                // place rather than unset. Identity-pairing only
                // resolves removed keys, so this reappearance is never
                // looked up, and the point degrades to the split
                // boundary, the same accepted limit the single-span
                // oracle documents for a short tail.
                const mapped = mapPointThroughSteps(steps, {
                  path: spanPath(blockKey, span.key),
                  offset: caretOffset,
                })
                expect(mapped).toEqual({
                  path: spanPath(blockKey, span.key),
                  offset: localOffset,
                })
                cases++
                continue
              }

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

    // Layout 1 (2 spans, split span 0 only): 6 local offsets (1..6) x
    // (7 + 7) caret positions across both spans = 84.
    // Layout 2 (3 spans, split spans 0 and 1): split 0 has 4 local offsets
    // (1..4) x (5 + 5 + 5) caret positions = 60; split 1 has 4 local
    // offsets (1..4) x (5 + 5 + 5) caret positions = 60.
    // Total: 84 + 60 + 60 = 204, exhaustive over the small space rather
    // than sampled.
    expect(cases).toBe(204)
  })
})

describe('interpretTransaction: adversarial recognizer misfires', () => {
  test('Probe A: an unrelated identical delete and insert in different blocks never pairs', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b2 = 'b2'
    const s2 = 's2'
    const seed = [
      makeBlock(b1, s1, 'hello cat world'),
      makeBlock(b2, s2, 'goodbye '),
    ]

    const patches: Array<Patch> = [
      // Deletes "cat" from block 1.
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
      {type: 'remove.text', path: spanPath(b1, s1), offset: 6, text: 'cat'},
      {type: 'insert.text', path: spanPath(b2, s2), offset: 8, text: 'cat'},
    ] satisfies Array<Step>)
  })

  test('Probe B: a one-character delete never pairs, even with matching typing elsewhere', () => {
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
      {type: 'remove.text', path: spanPath(b1, s1), offset: 3, text: 's'},
    ] satisfies Array<Step>)
  })

  test('Probe C: a node insertion preceding its matching removal never pairs', () => {
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
      {type: 'remove.text', path: spanPath(b0, s0), offset: 0, text: 'wxy'},
    ] satisfies Array<Step>)
  })

  test('Probe D: two identical splits in one batch resolve the ambiguity to no pairing', () => {
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
      {type: 'remove.text', path: spanPath(b1, s1), offset: 4, text: 'xyz'},
      {type: 'remove.text', path: spanPath(b2, s2), offset: 4, text: 'xyz'},
    ] satisfies Array<Step>)
  })

  test('Probe E: a span emptied by diffMatchPatch and then unset never offers its pre-empty text as a removal', () => {
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
      // Unrelated: someone types "abc" into block 2's existing span. If the
      // emptied-then-removed span offered its stale pre-empty text ("abc")
      // as a removal candidate instead of being excluded by its empty
      // current text, this would falsely pair as a move.
      {
        type: 'diffMatchPatch',
        path: [...spanPath(b2, s2), 'text'],
        value: dmpPatch('', 'abc'),
        origin: 'local',
      },
    ]

    const steps = interpretTransaction(seed, patches)

    expect(steps).toEqual([
      {type: 'remove.text', path: spanPath(b1, s1), offset: 0, text: 'abc'},
      {type: 'remove.node', path: spanPath(b1, s1)},
      {
        type: 'insert.text',
        path: spanPath(b2, s2),
        offset: 0,
        text: 'abc',
      },
    ] satisfies Array<Step>)
  })

  test('Probe R1: a whole-node removal matched by a node insertion and a fold at once pairs with neither', () => {
    const b1 = 'b1'
    const s1 = 's1'
    const b3 = 'b3'
    const s3 = 's3'
    const b4 = 'b4'
    const s4 = 's4'
    const seed = [makeBlock(b1, s1, 'bar'), makeBlock(b3, s3, 'foo')]

    const patches: Array<Patch> = [
      // A whole-node removal of "bar".
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

    // The removal reads "bar" as its text; both the node insertion and the
    // fold also read "bar", each independently the removal's only
    // candidate. Two independent claimants on one removal is ambiguity,
    // not a chain, so none of the three pairs.
    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath(b1, s1)},
      {
        type: 'insert.text',
        path: spanPath(b3, s3),
        offset: 3,
        text: 'bar',
      },
    ] satisfies Array<Step>)
  })

  test('Probe R2: a one-character whole-node removal never folds, even into a span typed at its exact end', () => {
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
        text: 'x',
      },
    ] satisfies Array<Step>)
  })

  test("Probe R3: a fold landing mid-span, not at the destination's end, never pairs", () => {
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
        text: 'bar',
      },
    ] satisfies Array<Step>)

    // The caret that sat between "X" and "Y" (offset 4) lands between the
    // newly typed "bar" and "Y": the plain `insert.text` step's own
    // semantics place it there, with no move to mis-map it elsewhere.
    const mapped = mapPointThroughSteps(steps, {
      path: spanPath(b2, s2),
      offset: 4,
    })

    expect(mapped).toEqual({path: spanPath(b2, s2), offset: 7})
  })

  test('Probe key-move duplicate: a removed key reappearing in more than one inserted node pairs with neither', () => {
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

    // The removed span's key shows up in two different inserted blocks:
    // with no way to tell which one it actually moved to, key-reappearance
    // recognizes neither, and the removal stays a plain `remove.node`.
    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath(b1, s1)},
    ] satisfies Array<Step>)
  })

  test('Probe key-move duplicate removal (case E): a key unset from two duplicate-keyed nodes, then reinserted once, pairs with neither', () => {
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

    // k1 was unset from two different nodes: with two candidate origins
    // for the single reinserted k1, neither is the answer, so
    // identity-pairing recognizes neither removal. Text-pairing finds no
    // match either ('qux' matches neither removed span's text). Both
    // removals stay plain `remove.node` steps, and nothing moves into the
    // reinserted copy.
    expect(steps).toEqual([
      {type: 'remove.node', path: spanPath(bHead, k1)},
      {type: 'remove.node', path: spanPath(bTail, k1)},
    ] satisfies Array<Step>)
  })

  test("sweep blast radius: a block move plus a genuine child unset in the same transaction leaves the child's caret dangling, not recovered", () => {
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

    // The block moves (reinserted under the same key), and identity-
    // pairing's supersession sweep drops every step addressing its old
    // path, including the genuinely deleted child's own `remove.node`:
    // the sweep can't tell content that traveled with the move apart from
    // content that didn't survive it, so it silently skips both alike.
    expect(steps).toEqual([
      {type: 'move.node', from: [{_key: bA}], to: [{_key: bA}]},
    ] satisfies Array<Step>)

    // A caret that sat on the deleted child rides the block's `move.node`
    // like any other point nested under its old path, landing on a child
    // key the destination doesn't actually have. The mapped path doesn't
    // resolve against the real result, pinning the silent skip as a
    // known, deliberate limit rather than a recognized recovery.
    const mapped = mapPointThroughSteps(steps, {
      path: [{_key: bA}, 'children', {_key: sChild}],
      offset: 1,
    })
    const resultBlocks = [
      makeBlock(anchor, sAnchor, 'anchor'),
      {
        _type: 'block',
        _key: bA,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: sX, text: 'foo', marks: []}],
      } satisfies PortableTextBlock,
    ]
    expect(mapped).not.toBeNull()
    expect(getValue(resultBlocks, mapped!.path)).toBeUndefined()
  })

  test('destination coordinates account for edits made to the destination between the move and its slot (review probe F3)', () => {
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

    // A caret in the middle of the moved "ab" (offset 1, between 'a' and
    // 'b') must land between the same two characters at the destination:
    // offset 2 in "Zab" (after "Za", before "b"). Placing the move earlier,
    // at the removal's own slot, would double-count the "Z" insertion that
    // lands ahead of it in the sequence and produce offset 3 instead.
    const mapped = mapPointThroughSteps(steps, {
      path: spanPath(source, sourceSpan),
      offset: 1,
    })

    expect(mapped).toEqual({
      path: spanPath(destination, destinationSpan),
      offset: 2,
    })
  })
})

describe('interpretTransaction oracle: repeated text across two blocks', () => {
  // Two blocks that both start out holding the same word: a transaction
  // that deletes one occurrence while inserting the identical text
  // elsewhere must not treat that coincidence as a move (probe A's shape),
  // and the oracle checks this deterministically rather than sampling.
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

      // No character was actually removed from the document (the deleted
      // "wolf " and the typed "wolf " are two different, unrelated
      // occurrences of the same word), so nothing may be recognized as
      // having moved.
      expect(steps.some((step) => step.type === 'move.text')).toBe(false)

      // Every caret in the deletion block that sits at or before the
      // deletion stays there; every caret in the typing block that sits at
      // or before the insertion stays there too. Both blocks are stable:
      // a point never crosses from one block to the other.
      for (const path of [
        spanPath(deletionBlock, deletionSpan),
        spanPath(typingBlock, typingSpan),
      ]) {
        for (let offset = 0; offset <= originalText.length; offset++) {
          const mapped = mapPointThroughSteps(steps, {path, offset})
          expect(mapped).not.toBeNull()
          expect(mapped!.path).toEqual(path)
          cases++
        }
      }
    }

    // 2 delete-from choices x 2 blocks x 9 caret positions (0..8, the
    // length of "wolf one"/"wolf two"): exhaustive over the small space,
    // deterministic without a seeded RNG.
    expect(cases).toBe(36)
  })
})

/** Build the `diffMatchPatch` wire value for turning `oldText` into `newText`. */
function dmpPatch(oldText: string, newText: string): string {
  return stringifyPatches(makePatches(oldText, newText))
}
