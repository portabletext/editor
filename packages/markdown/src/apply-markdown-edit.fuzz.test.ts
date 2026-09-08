import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {applyMarkdownEdit} from './apply-markdown-edit'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'

/**
 * Declares every construct `generateStored` produces, `lead` and
 * `highlight` included, so the fuzz exercises the same schema on both
 * conversion directions instead of falling back to the full built-in
 * default: a scoped schema that omitted a construct `generateStored`
 * still emits would silently degrade that construct on the round
 * trip (a fenced code block reverting to plain text, a bullet list
 * losing its list shape) rather than exercising restoration.
 */
const schema = compileSchema(
  defineSchema({
    styles: [{name: 'normal'}, {name: 'h2'}, {name: 'lead'}],
    decorators: [{name: 'strong'}, {name: 'highlight'}],
    lists: [{name: 'bullet'}],
    blockObjects: [
      {
        name: 'code',
        fields: [
          {name: 'language', type: 'string'},
          {name: 'code', type: 'string'},
        ],
      },
    ],
  }),
)

/**
 * A tiny deterministic PRNG (mulberry32): the fuzz corpus is generated
 * from fixed seeds, so a failure is always reproducible by re-running
 * this file, and CI never sees a flake from `Math.random()`.
 *
 * Keep in sync with the verbatim twin in
 * `src/portable-text-to-markdown.fuzz.test.ts`.
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

const WORDS = [
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'omega',
  'foo',
  'bar',
  'baz',
  'fizz',
  'buzz',
]

function pick<T>(random: () => number, items: ReadonlyArray<T>): T {
  return items[Math.floor(random() * items.length)]!
}

function sentence(random: () => number): string {
  const length = 3 + Math.floor(random() * 6)
  return Array.from({length}, () => pick(random, WORDS)).join(' ')
}

function generateStored(
  random: () => number,
  keyGenerator: () => string,
): Array<PortableTextBlock> {
  const blockCount = 1 + Math.floor(random() * 7)
  return Array.from({length: blockCount}, () => {
    const roll = random()
    if (roll < 0.15) {
      // Empty and whitespace-only text blocks have no markdown form as
      // plain `normal` paragraphs: exercises the reinsertion path
      // alongside every other block form. A non-normal style or a
      // `listItem` renders a visible marker instead (a heading prefix, a
      // list bullet), so those variants exercise ordinary reconciliation
      // rather than reinsertion.
      const styleRoll = random()
      const style = styleRoll < 0.6 ? 'normal' : styleRoll < 0.8 ? 'h2' : 'lead'
      // Paired with `h2` a list marker plus heading marker splits into
      // two blocks on reparse (a document-wide refusal case covered
      // elsewhere), so `listItem` only combines with `normal`.
      const listItem =
        style === 'normal' && random() < 0.3 ? 'bullet' : undefined
      return {
        _type: 'block',
        _key: keyGenerator(),
        style,
        ...(listItem ? {listItem, level: 1} : {}),
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: random() < 0.5 ? '' : ' ',
            marks: [],
          },
        ],
      } as unknown as PortableTextBlock
    }
    if (roll < 0.25) {
      return {
        _type: 'product',
        _key: keyGenerator(),
        sku: sentence(random),
      } as unknown as PortableTextBlock
    }
    if (roll < 0.35) {
      return {
        _type: 'code',
        _key: keyGenerator(),
        language: 'js',
        code: sentence(random),
      } as unknown as PortableTextBlock
    }
    if (roll < 0.45) {
      return {
        _type: 'block',
        _key: keyGenerator(),
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: `${sentence(random)} `,
            marks: [],
          },
          {
            _type: 'stockTicker',
            _key: keyGenerator(),
            symbol: pick(random, WORDS),
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: ` ${sentence(random)}`,
            marks: [],
          },
        ],
      } as unknown as PortableTextBlock
    }
    const markRoll = random()
    // `highlight` is declared in the schema but has no markdown form,
    // like `alignment` below: exercises restoration of a decorator the
    // round trip drops instead of carrying through the parse.
    const mark =
      markRoll < 0.3 ? 'strong' : markRoll < 0.5 ? 'highlight' : undefined
    const children = mark
      ? [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: `${sentence(random)} `,
            marks: [],
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: pick(random, WORDS),
            marks: [mark],
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: ` ${sentence(random)}`,
            marks: [],
          },
        ]
      : [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: sentence(random),
            marks: [],
          },
        ]
    const styleRoll = random()
    // `lead` is declared in the schema but has no markdown form either:
    // exercises restoration of a custom style dropped by the round trip.
    const style = styleRoll < 0.2 ? 'h2' : styleRoll < 0.35 ? 'lead' : 'normal'
    return {
      _type: 'block',
      _key: keyGenerator(),
      style,
      ...(random() < 0.25 ? {listItem: 'bullet', level: 1} : {}),
      // Markdown has no carrier for this field: exercises restoration
      // of a field that only the stored value ever held.
      ...(random() < 0.3 ? {alignment: pick(random, WORDS)} : {}),
      markDefs: [],
      children,
    } as unknown as PortableTextBlock
  })
}

/**
 * Mutates the markdown at paragraph granularity, never inside a fence:
 * fence bodies carry `json:object` payload keys, and corrupting one
 * would make the "keys come from the stored value" invariant
 * unverifiable rather than falsifiable.
 */
function mutateMarkdown(random: () => number, markdown: string): string {
  const paragraphs = markdown.split('\n\n')

  const mutations = 1 + Math.floor(random() * 3)
  for (let count = 0; count < mutations; count++) {
    const mutableIndexes = paragraphs
      .map((paragraph, index) => ({paragraph, index}))
      .filter(({paragraph}) => !paragraph.includes('```'))
      .map(({index}) => index)
    const roll = random()
    if (roll < 0.25 && mutableIndexes.length > 0) {
      // Replace one word.
      const index = pick(random, mutableIndexes)
      const words = paragraphs[index]!.split(' ')
      if (words.length > 0) {
        words[Math.floor(random() * words.length)] = pick(random, WORDS)
        paragraphs[index] = words.join(' ')
      }
    } else if (roll < 0.4) {
      // Insert a new paragraph.
      paragraphs.splice(
        Math.floor(random() * (paragraphs.length + 1)),
        0,
        sentence(random),
      )
    } else if (roll < 0.55 && paragraphs.length > 1) {
      // Delete a paragraph.
      paragraphs.splice(Math.floor(random() * paragraphs.length), 1)
    } else if (roll < 0.7 && paragraphs.length > 1) {
      // Swap two paragraphs.
      const a = Math.floor(random() * paragraphs.length)
      const b = Math.floor(random() * paragraphs.length)
      const held = paragraphs[a]!
      paragraphs[a] = paragraphs[b]!
      paragraphs[b] = held
    } else if (roll < 0.85) {
      // Duplicate a paragraph.
      const index = Math.floor(random() * paragraphs.length)
      paragraphs.splice(index, 0, paragraphs[index]!)
    } else if (mutableIndexes.length > 0) {
      // Split a paragraph at a word boundary.
      const index = pick(random, mutableIndexes)
      const words = paragraphs[index]!.split(' ')
      if (words.length > 2) {
        const cut = 1 + Math.floor(random() * (words.length - 2))
        paragraphs.splice(
          index,
          1,
          words.slice(0, cut).join(' '),
          words.slice(cut).join(' '),
        )
      }
    }
  }
  return paragraphs.join('\n\n')
}

/**
 * An empty or whitespace-only text block cloned back in verbatim from
 * a top-level stored block of the same key: markdown has no form for
 * either, so its only source is `reinsertEmptyRuns`, never the plain
 * parse. Emptiness is trimmed text, `applyMarkdownEdit`'s own
 * predicate for the same distinction. The verbatim-equality check
 * (not just an empty text and a stored key) is what keeps this from
 * also matching a block whose own edit emptied it: that block's key
 * is stored too, but its content no longer matches the stored node.
 */
function isRestoredEmptyBlock(
  node: unknown,
  storedByKey: ReadonlyMap<string, unknown>,
): boolean {
  if (typeof node !== 'object' || node === null) {
    return false
  }
  const record = node as Record<string, unknown>
  const children = record['children']
  if (!Array.isArray(children)) {
    return false
  }
  const text = children
    .map((child) =>
      typeof (child as Record<string, unknown>)['text'] === 'string'
        ? (child as Record<string, unknown>)['text']
        : '\uFFFC',
    )
    .join('')
  if (text.trim() !== '') {
    return false
  }
  const key = record['_key']
  if (typeof key !== 'string' || !storedByKey.has(key)) {
    return false
  }
  return JSON.stringify(node) === JSON.stringify(storedByKey.get(key))
}

/**
 * Collects every `[field name, JSON value]` pair anywhere in the
 * stored tree, the crude provenance oracle for a restored field: a
 * field the result carries but the plain parse does not must trace
 * to some stored node carrying the same name and value.
 */
function collectFieldPairs(value: unknown, pairs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFieldPairs(item, pairs)
    }
    return
  }
  if (typeof value === 'object' && value !== null) {
    for (const [field, fieldValue] of Object.entries(value)) {
      pairs.add(`${field}:${JSON.stringify(fieldValue)}`)
      collectFieldPairs(fieldValue, pairs)
    }
  }
}

/**
 * Reconciliation only ever adds keys and restored fields on top of
 * the plain parse, so the two stay congruent in shape (`result` and
 * `plainParse` walk in lockstep) at every node: every field the plain
 * parse produced survives in `result` at an equal value (`_key`
 * excluded, since reconciliation's whole job is changing it) unless
 * that whole field's value traces to the stored tree instead, the
 * same provenance rule an extra field is held to, and every extra
 * field `result` carries traces to the stored tree.
 */
function assertFieldwiseSubsetAndProvenance(
  result: unknown,
  plainParse: unknown,
  storedFieldPairs: ReadonlySet<string>,
): void {
  if (Array.isArray(plainParse)) {
    expect(Array.isArray(result)).toBe(true)
    const resultArray = result as Array<unknown>
    expect(resultArray.length).toBe(plainParse.length)
    for (let index = 0; index < plainParse.length; index++) {
      assertFieldwiseSubsetAndProvenance(
        resultArray[index],
        plainParse[index],
        storedFieldPairs,
      )
    }
    return
  }
  if (typeof plainParse === 'object' && plainParse !== null) {
    expect(typeof result === 'object' && result !== null).toBe(true)
    const resultNode = result as Record<string, unknown>
    const plainNode = plainParse as Record<string, unknown>
    for (const field of Object.keys(plainNode)) {
      if (field === '_key') {
        continue
      }
      expect(Object.hasOwn(resultNode, field)).toBe(true)
      const resultValue = resultNode[field]
      const plainValue = plainNode[field]
      if (
        JSON.stringify(resultValue) !== JSON.stringify(plainValue) &&
        storedFieldPairs.has(`${field}:${JSON.stringify(resultValue)}`)
      ) {
        continue
      }
      assertFieldwiseSubsetAndProvenance(
        resultValue,
        plainValue,
        storedFieldPairs,
      )
    }
    for (const field of Object.keys(resultNode)) {
      if (field === '_key' || Object.hasOwn(plainNode, field)) {
        continue
      }
      expect(
        storedFieldPairs.has(`${field}:${JSON.stringify(resultNode[field])}`),
      ).toBe(true)
    }
    return
  }
  expect(result).toEqual(plainParse)
}

function collectKeys(value: unknown, keys: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys)
    }
    return
  }
  if (typeof value === 'object' && value !== null) {
    for (const [field, fieldValue] of Object.entries(value)) {
      if (field === '_key' && typeof fieldValue === 'string') {
        keys.add(fieldValue)
      } else {
        collectKeys(fieldValue, keys)
      }
    }
  }
}

function assertSiblingKeysUnique(value: unknown): void {
  if (Array.isArray(value)) {
    const keys = value
      .map((item) =>
        typeof item === 'object' && item !== null
          ? (item as {_key?: unknown})._key
          : undefined,
      )
      .filter((key): key is string => typeof key === 'string')
    expect(new Set(keys).size).toBe(keys.length)
    for (const item of value) {
      assertSiblingKeysUnique(item)
    }
    return
  }
  if (typeof value === 'object' && value !== null) {
    for (const fieldValue of Object.values(value)) {
      assertSiblingKeysUnique(fieldValue)
    }
  }
}

describe('applyMarkdownEdit invariants (seeded fuzz)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const CASES_PER_SEED = 30

  test.each(SEEDS)('seed %i', (seed) => {
    const random = mulberry32(seed)

    for (let caseIndex = 0; caseIndex < CASES_PER_SEED; caseIndex++) {
      const storedKeyGenerator = createTestKeyGenerator('stored-')
      const stored = generateStored(random, storedKeyGenerator)
      const storedSnapshot = structuredClone(stored)
      const markdown = portableTextToMarkdown(structuredClone(stored), {
        schema,
      })
      const editedMarkdown = mutateMarkdown(random, markdown)

      const reconciled = applyMarkdownEdit(stored, editedMarkdown, {
        schema,
        deserialize: {keyGenerator: createTestKeyGenerator()},
      })

      const storedKeys = new Set<string>()
      collectKeys(storedSnapshot, storedKeys)
      const storedByKey = new Map<string, unknown>(
        storedSnapshot
          .filter(
            (node): node is PortableTextBlock & {_key: string} =>
              typeof (node as {_key?: unknown})['_key'] === 'string',
          )
          .map((node) => [node['_key'], node]),
      )

      // Content preservation: every field the plain parse produced
      // survives in the result, and every field the result adds on
      // top traces to the stored value.
      const plainParse = markdownToPortableText(editedMarkdown, {
        schema,
        keyGenerator: createTestKeyGenerator(),
      })
      const storedFieldPairs = new Set<string>()
      collectFieldPairs(storedSnapshot, storedFieldPairs)
      // Restored empty blocks have no markdown form, so the plain parse
      // never produced them: skip them here and let the key-provenance
      // and uniqueness checks below cover them instead.
      const reconciledWithoutRestoredEmptyBlocks = reconciled.filter(
        (node) => !isRestoredEmptyBlock(node, storedByKey),
      )
      assertFieldwiseSubsetAndProvenance(
        reconciledWithoutRestoredEmptyBlocks,
        plainParse,
        storedFieldPairs,
      )

      // Key provenance: every key is either stored, generated fresh,
      // or carried inside the markdown itself.
      const resultKeys = new Set<string>()
      collectKeys(reconciled, resultKeys)
      for (const key of resultKeys) {
        expect(
          storedKeys.has(key) ||
            /^k\d+$/.test(key) ||
            editedMarkdown.includes(key),
        ).toBe(true)
      }

      assertSiblingKeysUnique(reconciled)

      // Inputs are never mutated.
      expect(stored).toEqual(storedSnapshot)

      // Determinism: same inputs, same output.
      const again = applyMarkdownEdit(storedSnapshot, editedMarkdown, {
        schema,
        deserialize: {keyGenerator: createTestKeyGenerator()},
      })
      expect(again).toEqual(reconciled)
    }
  })
})
