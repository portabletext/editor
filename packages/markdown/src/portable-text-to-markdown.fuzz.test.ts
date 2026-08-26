import {createTestKeyGenerator} from '@portabletext/test'
import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock, TypedObject} from '@portabletext/types'
import {describe, expect, test} from 'vitest'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'

/**
 * A tiny deterministic PRNG (mulberry32): the fuzz corpus is generated from
 * fixed seeds, so a failure is always reproducible by re-running this file,
 * and CI never sees a flake from `Math.random()`.
 */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HOSTILE_ALPHABET = [
  ' ',
  '\t',
  ...'0123456789-+*#>=.()[]:\\`~&<abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ/;@_!',
  // Non-ASCII: markdown-it's emphasis-flanking rule classifies punctuation
  // by Unicode category, not ASCII alone, so an emoji, an em dash, and a
  // CJK character each need to flank a `_`/`*` run the same way an ASCII
  // punctuation character does.
  '\u{1f600}',
  '\u2014',
  '\u4e2d',
]

// Letters only: a decorator-free, wall-safe fill for an opaque inline
// object's own rendered text. It can't itself trigger a line-start rule
// (none of them fire on a letter) or seed/extend a linkify match on its
// own, so the only thing under test at its position is whether the
// surrounding hostile-alphabet leaves are still scanned correctly across
// the wall it stands in for.
const OPAQUE_SAFE_ALPHABET = [
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
]

const OPAQUE_PROBE_TYPE = 'fuzzOpaqueProbe'

const CONTEXTS = [
  'normal',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'list-bullet',
  'list-number',
  'list-task',
  'table-cell',
] as const
type Context = (typeof CONTEXTS)[number]

function pick<T>(random: () => number, items: ReadonlyArray<T>): T {
  const item = items[Math.floor(random() * items.length)]
  if (item === undefined) {
    throw new Error('Expected a non-empty array')
  }
  return item
}

function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function randomLeafText(random: () => number): string {
  const length = randomInt(random, 0, 6)
  let text = ''
  for (let i = 0; i < length; i++) {
    text += pick(random, HOSTILE_ALPHABET)
  }
  return text
}

function randomWhitespaceOnlyText(random: () => number): string {
  const length = randomInt(random, 1, 4)
  let text = ''
  for (let i = 0; i < length; i++) {
    text += pick(random, [' ', '\t'])
  }
  return text
}

function randomOpaqueSafeText(random: () => number): string {
  const length = randomInt(random, 1, 4)
  let text = ''
  for (let i = 0; i < length; i++) {
    text += pick(random, OPAQUE_SAFE_ALPHABET)
  }
  return text
}

type LeafKind = 'text' | 'link' | 'opaque'

interface GeneratedCase {
  context: Context
  leafTexts: Array<string>
  leafKinds: Array<LeafKind>
  expectedText: string
}

/**
 * A hard break's own markup (two trailing spaces before the newline) is
 * indistinguishable from a genuine trailing space right before it, and an
 * empty line after one doesn't round-trip either (there's no next line to
 * break to): both are real CommonMark ambiguities a text-escaping fix
 * can't resolve, not something in scope here. Only a hard break landing
 * between two leaves that both carry real, non-whitespace content right at
 * the boundary is generated, so the fuzz oracle only has to account for
 * the two *documented* exceptions (leading/trailing trim of the whole
 * text, and a linkified substring keeping its text).
 */
function canPlaceHardBreakBetween(before: string, after: string): boolean {
  return (
    before.length > 0 &&
    after.length > 0 &&
    !/[ \t]$/.test(before) &&
    !/^[ \t]/.test(after)
  )
}

function generateCase(random: () => number): GeneratedCase | null {
  const context = pick(random, CONTEXTS)
  const isHeading = /^h[1-6]$/.test(context)
  const leafCount = randomInt(random, 1, 3)

  const leafTexts: Array<string> = []
  for (let i = 0; i < leafCount; i++) {
    const roll = random()
    if (roll < 0.15) {
      leafTexts.push(randomWhitespaceOnlyText(random))
    } else {
      leafTexts.push(randomLeafText(random))
    }
  }

  const leafKinds: Array<LeafKind> = leafTexts.map(() => 'text')
  const variantRoll = random()
  if (variantRoll < 0.15) {
    // An opaque object stands in for an inline object or a leaf a custom
    // renderer replaces: at plan time its rendered text is unknown, so a
    // hazard scan can't run inline edits over it, only wall it off from
    // its neighbors. Its own text is a plain-letter fill so *it* never
    // introduces a hazard the oracle would have to model separately.
    const index = randomInt(random, 0, leafTexts.length - 1)
    leafTexts[index] = randomOpaqueSafeText(random)
    leafKinds[index] = 'opaque'
  } else if (variantRoll < 0.3 && leafTexts.length >= 3) {
    // A link label goes through the same hazard scan as plain text (plus
    // unconditional bracket/backslash escaping), so an interior index is
    // fair game; the first and last are skipped because the label's own
    // `[`/`)` becomes the line's true first/last rendered character - the
    // first is a pre-existing gap in line-start hazard planning, and the
    // last would defeat the oracle's own leading/trailing whitespace trim,
    // neither of which is what this variant is fuzzing.
    const index = randomInt(random, 1, leafTexts.length - 2)
    const candidate = leafTexts[index] ?? ''
    const precedingText = leafTexts[index - 1] ?? ''
    if (
      candidate.length > 0 &&
      !/^[ \t]*$/.test(candidate) &&
      // A label ending in one of the characters
      // `escapeLinkLabelBrackets` escapes, right before a leaf starting
      // with `(`/`[`, chains into the unrelated, pre-existing
      // `]`-before-link-open hazard and double-escapes the label's own
      // bracket - not what this variant is fuzzing.
      !/[[\]\\]$/.test(candidate) &&
      // A leaf ending in `!` right before a link reads back as an image
      // (`![...]`), a pre-existing gap this variant isn't fuzzing either.
      !precedingText.endsWith('!')
    ) {
      leafKinds[index] = 'link'
    }
  }

  // Headings are single-line ATX constructs: a hard break inside one forces
  // a structural split (a second block) on reparse, which is a documented,
  // separately-tested exception, not a text-identity fuzz property. Every
  // other context supports CommonMark's lazy paragraph continuation, so a
  // hard break there round-trips inside one block - except a table cell,
  // which has no newline syntax of its own (a cell's hard break renders as
  // `<br>`, and default `html.inline: 'skip'` drops it on reparse instead
  // of decoding it back into a newline): a separate, pre-existing limit on
  // table-cell content, not a text-escaping concern.
  if (
    !isHeading &&
    context !== 'table-cell' &&
    leafCount > 1 &&
    leafKinds.every((kind) => kind === 'text') &&
    random() < 0.4
  ) {
    const breakBefore = randomInt(random, 1, leafCount - 1)
    const before = leafTexts[breakBefore - 1] ?? ''
    const after = leafTexts[breakBefore] ?? ''
    if (canPlaceHardBreakBetween(before, after)) {
      leafTexts[breakBefore] = `\n${after}`
    }
  }

  const joined = leafTexts.join('')
  if (joined.length === 0) {
    return null
  }

  // The indented-code-block escape (`&#9;`/`&#32;`) preserves the *encoded*
  // character, not the leading run around it: CommonMark's ordinary 0-3
  // leading-space block indentation trim still applies to whatever literal
  // space/tab precedes it. Reproducing that interaction is already the
  // directed tests' job (the `roundTripCorpus` includes `'    indented'`
  // and `'\tx'`); the fuzz oracle only models the simple, whole-text trim.
  const firstLine = joined.split('\n')[0] ?? ''
  if (/^ {0,3}\t/.test(firstLine) || /^ {4}/.test(firstLine)) {
    return null
  }

  // A task item's own checkbox (`[ ] `/`[x] `/`[X] `) is a fixed-width
  // marker our own parser strips outright, unlike the variable-width
  // leading-space indentation every other context trims: the content's
  // own leading whitespace, right after that marker, survives untouched.
  const expectedText =
    context === 'list-task'
      ? joined.replace(/[ \t]+$/, '')
      : joined.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')
  if (expectedText.length === 0) {
    return null
  }

  return {context, leafTexts, leafKinds, expectedText}
}

function buildPortableText(
  generated: GeneratedCase,
  keyGenerator: () => string,
): Array<PortableTextBlock | TypedObject> {
  const linkKey = generated.leafKinds.includes('link')
    ? keyGenerator()
    : undefined

  const children = generated.leafTexts.map((text, index) => {
    const kind = generated.leafKinds[index]

    if (kind === 'opaque') {
      return {_type: OPAQUE_PROBE_TYPE, _key: keyGenerator(), text}
    }

    return {
      _type: 'span' as const,
      _key: keyGenerator(),
      text,
      marks:
        kind === 'link' && linkKey !== undefined
          ? [linkKey]
          : // An unrendered mark on every leaf but the last stands in for an
            // annotation/decorator the schema doesn't know how to render: it
            // splices its children's text back together without adding markup
            // of its own.
            index < generated.leafTexts.length - 1
            ? ['unrenderedMark']
            : [],
    }
  })

  const style = generated.context.startsWith('h')
    ? generated.context
    : generated.context === 'blockquote'
      ? 'blockquote'
      : 'normal'

  const block = {
    _type: 'block' as const,
    _key: keyGenerator(),
    style,
    markDefs:
      linkKey === undefined
        ? []
        : [{_key: linkKey, _type: 'link', href: 'https://example.com'}],
    children,
  }

  if (generated.context === 'list-bullet') {
    const result = [{...block, listItem: 'bullet', level: 1}]
    return result
  }
  if (generated.context === 'list-number') {
    const result = [{...block, listItem: 'number', level: 1}]
    return result
  }
  if (generated.context === 'list-task') {
    const result = [{...block, listItem: 'task', level: 1, checked: false}]
    return result
  }
  if (generated.context === 'table-cell') {
    const result = [
      {
        _type: 'table',
        _key: keyGenerator(),
        headerRows: 0,
        rows: [
          {
            _key: keyGenerator(),
            _type: 'row',
            cells: [{_key: keyGenerator(), _type: 'cell', value: [block]}],
          },
        ],
      },
    ]
    return result
  }

  return [block]
}

function extractRenderedText(
  generated: GeneratedCase,
  portableText: Array<PortableTextBlock | TypedObject>,
): string {
  if (generated.context === 'table-cell') {
    const table = portableText[0] as unknown as {
      rows: Array<{cells: Array<{value: Array<PortableTextBlock>}>}>
    }
    const cellBlock = table.rows[0]?.cells[0]?.value[0]
    if (!cellBlock || !isPortableTextBlock(cellBlock)) {
      throw new Error('Expected a text block inside the table cell')
    }
    return blockText(cellBlock)
  }

  const block = portableText[0]
  if (!block || !isPortableTextBlock(block)) {
    throw new Error('Expected the first node to be a portable text block')
  }
  return blockText(block)
}

function blockText(block: PortableTextBlock): string {
  return block.children
    .filter(isPortableTextSpan)
    .map((span) => span.text)
    .join('')
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const CASES_PER_SEED = 200

describe('portableTextToMarkdown fuzz (seeded, deterministic)', () => {
  test(
    'PT -> MD -> PT text identity, modulo leading/trailing whitespace trim',
    {timeout: 30_000},
    () => {
      const failures: Array<{
        seed: number
        caseIndex: number
        generated: GeneratedCase
        markdown: string
        actual: string
      }> = []

      let attempted = 0

      for (const seed of SEEDS) {
        const random = mulberry32(seed)
        for (let caseIndex = 0; caseIndex < CASES_PER_SEED; caseIndex++) {
          const generated = generateCase(random)
          if (!generated) {
            continue
          }
          attempted++

          const keyGenerator = createTestKeyGenerator()
          const portableText = buildPortableText(generated, keyGenerator)

          let markdown: string
          try {
            markdown = portableTextToMarkdown(portableText, {
              types: {
                [OPAQUE_PROBE_TYPE]: ({value}) =>
                  (value as {text: string}).text,
              },
            })
          } catch (error) {
            failures.push({
              seed,
              caseIndex,
              generated,
              markdown: `<threw: ${String(error)}>`,
              actual: '<n/a>',
            })
            continue
          }

          let actual: string
          try {
            const reparsed = markdownToPortableText(markdown)
            actual = extractRenderedText(generated, reparsed)
          } catch (error) {
            failures.push({
              seed,
              caseIndex,
              generated,
              markdown,
              actual: `<threw: ${String(error)}>`,
            })
            continue
          }

          if (actual !== generated.expectedText) {
            failures.push({seed, caseIndex, generated, markdown, actual})
          }
        }
      }

      if (failures.length > 0) {
        const sample = failures
          .slice(0, 10)
          .map(
            (failure) =>
              `seed ${failure.seed} case ${failure.caseIndex} (${failure.generated.context}): leaves ${JSON.stringify(failure.generated.leafTexts)} -> markdown ${JSON.stringify(failure.markdown)} -> got ${JSON.stringify(failure.actual)}, expected ${JSON.stringify(failure.generated.expectedText)}`,
          )
          .join('\n')
        expect.fail(
          `${failures.length} of ${attempted} fuzz cases failed text identity:\n${sample}`,
        )
      }
    },
  )
})
