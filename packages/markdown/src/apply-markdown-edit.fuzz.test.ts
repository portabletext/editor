import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {applyMarkdownEdit} from './apply-markdown-edit'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'

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
    if (roll < 0.1) {
      return {
        _type: 'product',
        _key: keyGenerator(),
        sku: sentence(random),
      } as unknown as PortableTextBlock
    }
    if (roll < 0.2) {
      return {
        _type: 'code',
        _key: keyGenerator(),
        language: 'js',
        code: sentence(random),
      } as unknown as PortableTextBlock
    }
    if (roll < 0.3) {
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
    const strongWord = random() < 0.4
    const children = strongWord
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
            marks: ['strong'],
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
    return {
      _type: 'block',
      _key: keyGenerator(),
      style: random() < 0.2 ? 'h2' : 'normal',
      ...(random() < 0.25 ? {listItem: 'bullet', level: 1} : {}),
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

function stripKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripKeys)
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([field]) => field !== '_key')
        .map(([field, fieldValue]) => [field, stripKeys(fieldValue)]),
    )
  }
  return value
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
      const markdown = portableTextToMarkdown(structuredClone(stored))
      const editedMarkdown = mutateMarkdown(random, markdown)

      const reconciled = applyMarkdownEdit(stored, editedMarkdown, {
        deserialize: {keyGenerator: createTestKeyGenerator()},
      })

      // Content preservation: reconciliation only ever touches keys.
      const plainParse = markdownToPortableText(editedMarkdown, {
        keyGenerator: createTestKeyGenerator(),
      })
      expect(stripKeys(reconciled)).toEqual(stripKeys(plainParse))

      // Key provenance: every key is either stored, generated fresh,
      // or carried inside the markdown itself.
      const storedKeys = new Set<string>()
      collectKeys(storedSnapshot, storedKeys)
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
        deserialize: {keyGenerator: createTestKeyGenerator()},
      })
      expect(again).toEqual(reconciled)
    }
  })
})
