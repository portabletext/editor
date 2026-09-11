import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {applyMarkdownEdit} from './apply-markdown-edit'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'

/**
 * Declares every construct the generator below produces, so ownership
 * reconciliation runs the same schema on both conversion directions
 * `applyMarkdownEdit` itself requires. `widget` (the undeclared block
 * object stratum) is deliberately absent: it must ride the `json:object`
 * fence rather than a declared renderer.
 */
const schema = compileSchema(
  defineSchema({
    styles: [{name: 'normal'}, {name: 'h2'}, {name: 'h3'}, {name: 'lead'}],
    // `highlight` has no markdown form: the span-mark strata exercise
    // an unmappable decorator alongside `strong`/`em`, so an untouched
    // block carrying one still has to come back exactly as stored.
    decorators: [{name: 'strong'}, {name: 'em'}, {name: 'highlight'}],
    lists: [{name: 'bullet'}, {name: 'number'}],
    annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
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
 * A tiny deterministic PRNG (mulberry32): the corpus is generated from
 * fixed seeds, so a failure is always reproducible by re-running this
 * file. Verbatim twin of the one in `apply-markdown-edit.fuzz.test.ts`
 * and `portable-text-to-markdown.fuzz.test.ts`; keep it in sync.
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

function pick<T>(random: () => number, items: ReadonlyArray<T>): T {
  return items[Math.floor(random() * items.length)]!
}

const SENTINEL_WORDS = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
]

/**
 * Every sentinel is globally unique within its case: a fixed-width,
 * strictly increasing numeric suffix means no sentinel is ever a
 * substring of another, which is what lets ownership be decided by a
 * plain `.includes()` content lookup with zero alignment ambiguity.
 */
function makeSentinelFactory(caseId: number): () => string {
  let counter = 0
  return () => {
    const word = SENTINEL_WORDS[counter % SENTINEL_WORDS.length]
    const suffix = String(counter).padStart(4, '0')
    counter++
    return `b${caseId}-${word}${suffix}`
  }
}

type KeyFactory = (prefix: string) => string

/**
 * Stored keys come from a per-case deterministic counter, not
 * `createTestKeyGenerator`, so the expected key for any stored node is
 * writable straight from the model (`b3`, `s7`, ...) instead of having
 * to be captured off a generator at generation time.
 */
function makeKeyFactory(): KeyFactory {
  const counters = new Map<string, number>()
  return (prefix: string) => {
    const next = (counters.get(prefix) ?? 0) + 1
    counters.set(prefix, next)
    return `${prefix}${next}`
  }
}

function span(nextKey: KeyFactory, text: string, marks: Array<string>) {
  return {_type: 'span', _key: nextKey('s'), text, marks}
}

type Token = {value: string; href?: string; expectedDefKey?: string}

type ContentKind =
  | 'plain'
  | 'heading2'
  | 'heading3'
  | 'lead'
  | 'decorator'
  | 'link'
  | 'linkBold'
  | 'doubleLink'
  | 'magic'
  | 'code'
  | 'widget'

type EmptyBlockModel = {blockKey: string; spanKey: string; text: string}

type ContentUnit = {
  kind: ContentKind
  index: number
  block: PortableTextBlock
  blockKey: string
  tokens: Array<Token>
  magic?: string
  trailingEmpty?: Array<EmptyBlockModel>
  outcome: 'unchanged' | 'removed'
}

type ListItemModel = {
  block: PortableTextBlock
  blockKey: string
  tokens: Array<Token>
}

type ListRunUnit = {
  kind: 'listRun'
  index: number
  items: Array<ListItemModel>
}

type Unit = ContentUnit | ListRunUnit

type FreshUnit = {id: number; tokens: Array<Token>}

type Slot = {sourceUnitIndex: number | null; text: string}

function makeListItemBlock(
  nextKey: KeyFactory,
  text: string,
  listItem: 'bullet' | 'number',
  level: 1 | 2,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: nextKey('b'),
    style: 'normal',
    listItem,
    level,
    markDefs: [],
    children: [span(nextKey, text, [])],
  } as unknown as PortableTextBlock
}

function makeUnit(
  random: () => number,
  sentinel: () => string,
  nextKey: KeyFactory,
  index: number,
  previousKind: ContentKind | 'listRun' | undefined,
): Unit {
  const roll = random()

  // Two adjacent list runs would join into one continuously renumbered
  // list under the real serializer's block-spacing rule (consecutive
  // list items always join with a single newline), which the per-unit
  // rendering below cannot reproduce in isolation: forcing a plain
  // paragraph here instead keeps every unit's markdown self-contained.
  if (roll >= 0.94 && previousKind === 'listRun') {
    const tokens: Array<Token> = [{value: sentinel()}, {value: sentinel()}]
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [span(nextKey, tokens.map((t) => t.value).join(' '), [])],
    } as unknown as PortableTextBlock
    return {kind: 'plain', index, block, blockKey, tokens, outcome: 'unchanged'}
  }

  if (roll < 0.15) {
    const tokens: Array<Token> = [{value: sentinel()}, {value: sentinel()}]
    if (random() < 0.4) {
      tokens.push({value: sentinel()})
    }
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [span(nextKey, tokens.map((t) => t.value).join(' '), [])],
    } as unknown as PortableTextBlock
    return {kind: 'plain', index, block, blockKey, tokens, outcome: 'unchanged'}
  }

  if (roll < 0.25 || roll < 0.32) {
    const style = roll < 0.25 ? 'h2' : 'h3'
    const tokens: Array<Token> = [{value: sentinel()}]
    if (random() < 0.5) {
      tokens.push({value: sentinel()})
    }
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style,
      markDefs: [],
      children: [span(nextKey, tokens.map((t) => t.value).join(' '), [])],
    } as unknown as PortableTextBlock
    return {
      kind: style === 'h2' ? 'heading2' : 'heading3',
      index,
      block,
      blockKey,
      tokens,
      outcome: 'unchanged',
    }
  }

  if (roll < 0.4) {
    const tokens: Array<Token> = [{value: sentinel()}]
    if (random() < 0.5) {
      tokens.push({value: sentinel()})
    }
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'lead',
      markDefs: [],
      children: [span(nextKey, tokens.map((t) => t.value).join(' '), [])],
    } as unknown as PortableTextBlock
    return {kind: 'lead', index, block, blockKey, tokens, outcome: 'unchanged'}
  }

  if (roll < 0.48) {
    const markName = pick(random, ['strong', 'em', 'highlight'] as const)
    const tokens: Array<Token> = [
      {value: sentinel()},
      {value: sentinel()},
      {value: sentinel()},
    ]
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [],
      children: [
        span(nextKey, `${tokens[0]!.value} `, []),
        span(nextKey, tokens[1]!.value, [markName]),
        span(nextKey, ` ${tokens[2]!.value}`, []),
      ],
    } as unknown as PortableTextBlock
    return {
      kind: 'decorator',
      index,
      block,
      blockKey,
      tokens,
      outcome: 'unchanged',
    }
  }

  if (roll < 0.58) {
    const linkKey = nextKey('l')
    const href = `https://example.com/${nextKey('href')}`
    const tokens: Array<Token> = [
      {value: sentinel()},
      {value: sentinel(), href, expectedDefKey: linkKey},
      {value: sentinel()},
    ]
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [{_key: linkKey, _type: 'link', href}],
      children: [
        span(nextKey, `${tokens[0]!.value} `, []),
        span(nextKey, tokens[1]!.value, [linkKey]),
        span(nextKey, ` ${tokens[2]!.value}`, []),
      ],
    } as unknown as PortableTextBlock
    return {kind: 'link', index, block, blockKey, tokens, outcome: 'unchanged'}
  }

  if (roll < 0.66) {
    const markName = pick(random, ['strong', 'em'] as const)
    const linkKey = nextKey('l')
    const href = `https://example.com/${nextKey('href')}`
    const tokens: Array<Token> = [
      {value: sentinel(), href, expectedDefKey: linkKey},
      {value: sentinel(), href, expectedDefKey: linkKey},
      {value: sentinel(), href, expectedDefKey: linkKey},
    ]
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [{_key: linkKey, _type: 'link', href}],
      children: [
        span(nextKey, `${tokens[0]!.value} `, [linkKey]),
        span(nextKey, tokens[1]!.value, [linkKey, markName]),
        span(nextKey, ` ${tokens[2]!.value}`, [linkKey]),
      ],
    } as unknown as PortableTextBlock
    return {
      kind: 'linkBold',
      index,
      block,
      blockKey,
      tokens,
      outcome: 'unchanged',
    }
  }

  if (roll < 0.74) {
    const linkKeyA = nextKey('l')
    const linkKeyB = nextKey('l')
    const href = `https://example.com/${nextKey('href')}`
    const tokens: Array<Token> = [
      {value: sentinel(), href, expectedDefKey: linkKeyA},
      {value: sentinel()},
      {value: sentinel(), href, expectedDefKey: linkKeyB},
    ]
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      markDefs: [
        {_key: linkKeyA, _type: 'link', href},
        {_key: linkKeyB, _type: 'link', href},
      ],
      children: [
        span(nextKey, tokens[0]!.value, [linkKeyA]),
        span(nextKey, ` ${tokens[1]!.value} `, []),
        span(nextKey, tokens[2]!.value, [linkKeyB]),
      ],
    } as unknown as PortableTextBlock
    return {
      kind: 'doubleLink',
      index,
      block,
      blockKey,
      tokens,
      outcome: 'unchanged',
    }
  }

  if (roll < 0.82) {
    const tokens: Array<Token> = [{value: sentinel()}]
    if (random() < 0.5) {
      tokens.push({value: sentinel()})
    }
    const magic = `magic-${sentinel()}`
    const blockKey = nextKey('b')
    const block = {
      _type: 'block',
      _key: blockKey,
      style: 'normal',
      magic,
      markDefs: [],
      children: [span(nextKey, tokens.map((t) => t.value).join(' '), [])],
    } as unknown as PortableTextBlock
    return {
      kind: 'magic',
      index,
      block,
      blockKey,
      tokens,
      magic,
      outcome: 'unchanged',
    }
  }

  if (roll < 0.88) {
    const tokens: Array<Token> = [{value: sentinel()}]
    const blockKey = nextKey('b')
    const block = {
      _type: 'code',
      _key: blockKey,
      language: 'js',
      code: tokens[0]!.value,
    } as unknown as PortableTextBlock
    return {kind: 'code', index, block, blockKey, tokens, outcome: 'unchanged'}
  }

  if (roll < 0.94) {
    const tokens: Array<Token> = [{value: sentinel()}]
    const blockKey = nextKey('b')
    const block = {
      _type: 'widget',
      _key: blockKey,
      note: tokens[0]!.value,
    } as unknown as PortableTextBlock
    return {
      kind: 'widget',
      index,
      block,
      blockKey,
      tokens,
      outcome: 'unchanged',
    }
  }

  const itemCount = random() < 0.5 ? 2 : 3
  const items: Array<ListItemModel> = Array.from(
    {length: itemCount},
    (_, itemIndex) => {
      const listItem = pick(random, ['bullet', 'number'] as const)
      const level = itemIndex === 0 ? 1 : pick(random, [1, 2] as const)
      const value = sentinel()
      const block = makeListItemBlock(nextKey, value, listItem, level)
      return {block, blockKey: block._key as string, tokens: [{value}]}
    },
  )
  return {kind: 'listRun', index, items}
}

function renderUnit(unit: Unit): string {
  if (unit.kind === 'listRun') {
    return portableTextToMarkdown(
      unit.items.map((item) => item.block),
      {schema},
    )
  }
  return portableTextToMarkdown([unit.block], {schema})
}

function replaceOnce(text: string, oldValue: string, newValue: string): string {
  const index = text.indexOf(oldValue)
  if (index === -1) {
    throw new Error(`expected "${oldValue}" inside ${JSON.stringify(text)}`)
  }
  return text.slice(0, index) + newValue + text.slice(index + oldValue.length)
}

type LinkCheck = {word: string; href: string; expectedDefKey: string}
type MagicCheck = {word: string; expectedMagic: string}
type WidgetCheck = {word: string; expectedKey: string; expectedNote: string}
type EmptyRunCheck = {blocks: Array<EmptyBlockModel>}

type CaseData = {
  stored: Array<PortableTextBlock>
  editedMarkdown: string
  storedKeySet: Set<string>
  blockKeyByWord: Map<string, string>
  freshWords: Set<string>
  removedAnyKeys: Set<string>
  linkChecks: Array<LinkCheck>
  magicChecks: Array<MagicCheck>
  widgetChecks: Array<WidgetCheck>
  emptyRunChecks: Array<EmptyRunCheck>
  untouchedBlocks: Map<string, PortableTextBlock>
  appliedOpCount: number
}

/**
 * The whole model: a stratified corpus of sentinel-tagged units, 1-3
 * scripted edits applied to their serialized markdown, and the
 * ownership expectations those edits imply. Every downstream
 * assertion is checked against this model, never against the
 * algorithm's own output.
 */
function buildCase(random: () => number, caseId: number): CaseData {
  const sentinel = makeSentinelFactory(caseId)
  const nextKey = makeKeyFactory()

  const unitCount = 6 + Math.floor(random() * 5)
  const units: Array<Unit> = []
  for (let index = 0; index < unitCount; index++) {
    const previousKind = units.at(-1)?.kind
    units.push(makeUnit(random, sentinel, nextKey, index, previousKind))
  }

  for (const unit of units) {
    if (unit.kind === 'listRun') {
      continue
    }
    if (random() < 0.25) {
      const count = random() < 0.5 ? 1 : 2
      const blocks: Array<EmptyBlockModel> = []
      for (let k = 0; k < count; k++) {
        const textRoll = random()
        const text = textRoll < 0.4 ? '' : textRoll < 0.7 ? ' ' : '\u00a0'
        blocks.push({blockKey: nextKey('e'), spanKey: nextKey('es'), text})
      }
      unit.trailingEmpty = blocks
    }
  }

  const stored: Array<PortableTextBlock> = []
  const slots: Array<Slot> = []
  for (const unit of units) {
    if (unit.kind === 'listRun') {
      for (const item of unit.items) {
        stored.push(item.block)
      }
      slots.push({sourceUnitIndex: unit.index, text: renderUnit(unit)})
      continue
    }
    stored.push(unit.block)
    if (unit.trailingEmpty) {
      for (const empty of unit.trailingEmpty) {
        stored.push({
          _type: 'block',
          _key: empty.blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: empty.spanKey, text: empty.text, marks: []},
          ],
        } as unknown as PortableTextBlock)
      }
    }
    slots.push({sourceUnitIndex: unit.index, text: renderUnit(unit)})
  }

  const storedKeySet = new Set<string>()
  collectAllKeys(stored, storedKeySet)

  const assembled = slots.map((s) => s.text).join('\n\n')
  const direct = portableTextToMarkdown(structuredClone(stored), {schema})
  if (assembled !== direct) {
    throw new Error(
      `paragraph model diverged from the real serializer.\nAssembled: ${JSON.stringify(assembled)}\nDirect:    ${JSON.stringify(direct)}`,
    )
  }

  const usedIndexes = new Set<number>()
  const reservedIndexes = new Set<number>()
  const usedSeams = new Set<number>()
  const freshUnits: Array<FreshUnit> = []
  let freshIdCounter = -1

  const reserve = (i: number) => {
    reservedIndexes.add(i - 1)
    reservedIndexes.add(i)
    reservedIndexes.add(i + 1)
  }
  const isFreeUnit = (i: number) =>
    i >= 0 && i < units.length && !usedIndexes.has(i) && !reservedIndexes.has(i)

  const contentIndexes = (
    filter?: (u: ContentUnit) => boolean,
  ): Array<number> => {
    const out: Array<number> = []
    units.forEach((u, i) => {
      if (u.kind === 'listRun') {
        return
      }
      if (!isFreeUnit(i)) {
        return
      }
      if (filter && !filter(u)) {
        return
      }
      out.push(i)
    })
    return out
  }

  type RewriteTarget =
    | {unitIndex: number; kind: 'content'; tokenIndex: number}
    | {unitIndex: number; kind: 'listItem'; itemIndex: number}

  const rewriteTargets = (): Array<RewriteTarget> => {
    const out: Array<RewriteTarget> = []
    units.forEach((u, i) => {
      if (!isFreeUnit(i)) {
        return
      }
      if (u.kind === 'listRun') {
        u.items.forEach((_, itemIndex) =>
          out.push({unitIndex: i, kind: 'listItem', itemIndex}),
        )
        return
      }
      if (u.kind === 'widget') {
        return
      }
      u.tokens.forEach((_, tokenIndex) =>
        out.push({unitIndex: i, kind: 'content', tokenIndex}),
      )
    })
    return out
  }

  const wholeBlockTargets = (): Array<number> => contentIndexes()
  const splitTargets = (): Array<number> =>
    contentIndexes((u) => u.kind === 'plain' && u.tokens.length >= 2)
  const mergeTargets = (): Array<number> => {
    const out: Array<number> = []
    for (let i = 0; i < units.length - 1; i++) {
      const a = units[i]!
      const b = units[i + 1]!
      if (a.kind !== 'plain' || b.kind !== 'plain') {
        continue
      }
      if (!isFreeUnit(i) || !isFreeUnit(i + 1)) {
        continue
      }
      out.push(i)
    }
    return out
  }
  const seamCandidates = (): Array<number> => {
    const out: Array<number> = []
    for (let i = 0; i <= units.length; i++) {
      if (usedSeams.has(i)) {
        continue
      }
      const leftOk = i === 0 || isFreeUnit(i - 1)
      const rightOk = i === units.length || isFreeUnit(i)
      if (leftOk && rightOk) {
        out.push(i)
      }
    }
    return out
  }
  const commitSeam = (seam: number) => {
    usedSeams.add(seam)
    if (seam - 1 >= 0) {
      usedIndexes.add(seam - 1)
      reserve(seam - 1)
    }
    if (seam < units.length) {
      usedIndexes.add(seam)
      reserve(seam)
    }
  }
  const findSlotIndexForUnit = (unitIndex: number): number =>
    slots.findIndex((s) => s.sourceUnitIndex === unitIndex)
  const seamPosition = (seam: number): number => {
    if (seam === units.length) {
      return slots.length
    }
    return slots.findIndex((s) => s.sourceUnitIndex === seam)
  }

  const applyOneOp = (opType: string): boolean => {
    if (opType === 'rewrite' || opType === 'append') {
      const targets = rewriteTargets()
      if (targets.length === 0) {
        return false
      }
      const target = pick(random, targets)
      const newWord = sentinel()
      const slotIdx = findSlotIndexForUnit(target.unitIndex)
      if (target.kind === 'listItem') {
        const unit = units[target.unitIndex] as ListRunUnit
        const item = unit.items[target.itemIndex]!
        const anchor = item.tokens[0]!.value
        if (opType === 'rewrite') {
          slots[slotIdx]!.text = replaceOnce(
            slots[slotIdx]!.text,
            anchor,
            newWord,
          )
          item.tokens[0]!.value = newWord
        } else {
          slots[slotIdx]!.text = replaceOnce(
            slots[slotIdx]!.text,
            anchor,
            `${anchor} ${newWord}`,
          )
          item.tokens.push({value: newWord})
        }
      } else {
        const unit = units[target.unitIndex] as ContentUnit
        const token = unit.tokens[target.tokenIndex]!
        if (opType === 'rewrite') {
          slots[slotIdx]!.text = replaceOnce(
            slots[slotIdx]!.text,
            token.value,
            newWord,
          )
          token.value = newWord
        } else {
          slots[slotIdx]!.text = replaceOnce(
            slots[slotIdx]!.text,
            token.value,
            `${token.value} ${newWord}`,
          )
          unit.tokens.push({
            value: newWord,
            href: token.href,
            expectedDefKey: token.expectedDefKey,
          })
        }
      }
      usedIndexes.add(target.unitIndex)
      reserve(target.unitIndex)
      return true
    }

    if (opType === 'delete') {
      const targets = wholeBlockTargets()
      if (targets.length === 0) {
        return false
      }
      const target = pick(random, targets)
      const slotIdx = findSlotIndexForUnit(target)
      slots.splice(slotIdx, 1)
      ;(units[target] as ContentUnit).outcome = 'removed'
      usedIndexes.add(target)
      reserve(target)
      return true
    }

    if (opType === 'move') {
      const sourceCandidates = wholeBlockTargets()
      if (sourceCandidates.length === 0) {
        return false
      }
      const source = pick(random, sourceCandidates)
      const seams = seamCandidates().filter(
        (s) => s !== source && s !== source + 1,
      )
      if (seams.length === 0) {
        return false
      }
      const seam = pick(random, seams)
      const slotIdx = findSlotIndexForUnit(source)
      const text = slots[slotIdx]!.text
      slots.splice(slotIdx, 1)
      const pos = seamPosition(seam)
      slots.splice(pos, 0, {sourceUnitIndex: source, text})
      usedIndexes.add(source)
      reserve(source)
      commitSeam(seam)
      return true
    }

    if (opType === 'split') {
      const targets = splitTargets()
      if (targets.length === 0) {
        return false
      }
      const target = pick(random, targets)
      const unit = units[target] as ContentUnit
      const splitAt = 1 + Math.floor(random() * (unit.tokens.length - 1))
      const firstTokens = unit.tokens.slice(0, splitAt)
      const secondTokens = unit.tokens.slice(splitAt)
      unit.tokens = firstTokens
      const slotIdx = findSlotIndexForUnit(target)
      slots[slotIdx]!.text = firstTokens.map((t) => t.value).join(' ')
      freshUnits.push({
        id: freshIdCounter--,
        tokens: secondTokens.map((t) => ({value: t.value})),
      })
      slots.splice(slotIdx + 1, 0, {
        sourceUnitIndex: null,
        text: secondTokens.map((t) => t.value).join(' '),
      })
      usedIndexes.add(target)
      reserve(target)
      return true
    }

    if (opType === 'merge') {
      const targets = mergeTargets()
      if (targets.length === 0) {
        return false
      }
      const first = pick(random, targets)
      const second = first + 1
      const unitA = units[first] as ContentUnit
      const unitB = units[second] as ContentUnit
      const slotIdxA = findSlotIndexForUnit(first)
      const slotIdxB = findSlotIndexForUnit(second)
      slots[slotIdxA]!.text =
        `${slots[slotIdxA]!.text} ${slots[slotIdxB]!.text}`
      slots.splice(slotIdxB, 1)
      unitA.tokens.push(...unitB.tokens)
      unitB.tokens = []
      unitB.outcome = 'removed'
      usedIndexes.add(first)
      usedIndexes.add(second)
      reserve(first)
      reserve(second)
      return true
    }

    if (opType === 'insert') {
      const seams = seamCandidates()
      if (seams.length === 0) {
        return false
      }
      const seam = pick(random, seams)
      const tokenCount = 1 + Math.floor(random() * 2)
      const tokens: Array<Token> = Array.from({length: tokenCount}, () => ({
        value: sentinel(),
      }))
      freshUnits.push({id: freshIdCounter--, tokens})
      const pos = seamPosition(seam)
      slots.splice(pos, 0, {
        sourceUnitIndex: null,
        text: tokens.map((t) => t.value).join(' '),
      })
      commitSeam(seam)
      return true
    }

    return false
  }

  const opCount = 1 + Math.floor(random() * 3)
  let applied = 0
  let guard = 0
  while (applied < opCount && guard < 40) {
    guard++
    const opType = pick(random, [
      'rewrite',
      'append',
      'delete',
      'move',
      'split',
      'merge',
      'merge',
      'merge',
      'merge',
      'insert',
    ])
    if (applyOneOp(opType)) {
      applied++
    }
  }

  const editedMarkdown = slots.map((s) => s.text).join('\n\n')

  const blockKeyByWord = new Map<string, string>()
  const freshWords = new Set<string>()
  const removedAnyKeys = new Set<string>()
  const linkChecks: Array<LinkCheck> = []
  const magicChecks: Array<MagicCheck> = []
  const widgetChecks: Array<WidgetCheck> = []
  const emptyRunChecks: Array<EmptyRunCheck> = []
  const untouchedBlocks = new Map<string, PortableTextBlock>()

  for (const unit of units) {
    if (unit.kind === 'listRun') {
      for (const item of unit.items) {
        for (const token of item.tokens) {
          blockKeyByWord.set(token.value, item.blockKey)
        }
      }
      // No op ever targets an individual list item on its own: a
      // rewrite/append marks the whole run's unit index used, so an
      // untouched run means every one of its items is untouched too.
      if (!usedIndexes.has(unit.index)) {
        for (const item of unit.items) {
          untouchedBlocks.set(item.blockKey, item.block)
        }
      }
      continue
    }
    if (unit.outcome === 'removed') {
      removedAnyKeys.add(unit.blockKey)
      if (unit.trailingEmpty) {
        for (const empty of unit.trailingEmpty) {
          removedAnyKeys.add(empty.blockKey)
        }
      }
      continue
    }
    for (const token of unit.tokens) {
      blockKeyByWord.set(token.value, unit.blockKey)
      if (token.href) {
        linkChecks.push({
          word: token.value,
          href: token.href,
          expectedDefKey: token.expectedDefKey!,
        })
      }
    }
    if (unit.kind === 'magic') {
      magicChecks.push({
        word: unit.tokens[0]!.value,
        expectedMagic: unit.magic!,
      })
    }
    if (unit.kind === 'widget') {
      widgetChecks.push({
        word: unit.tokens[0]!.value,
        expectedKey: unit.blockKey,
        expectedNote: unit.tokens[0]!.value,
      })
    }
    if (unit.trailingEmpty) {
      emptyRunChecks.push({blocks: unit.trailingEmpty})
    }
    // No op ever targets this unit: no rewrite touched its text, no
    // move relocated it, nothing merged or split it away. The block
    // the algorithm returns for its key should be the stored block,
    // not merely a block whose sentinel words still resolve there.
    if (!usedIndexes.has(unit.index)) {
      untouchedBlocks.set(unit.blockKey, unit.block)
    }
  }
  for (const fresh of freshUnits) {
    for (const token of fresh.tokens) {
      freshWords.add(token.value)
    }
  }

  return {
    stored,
    editedMarkdown,
    storedKeySet,
    blockKeyByWord,
    freshWords,
    removedAnyKeys,
    linkChecks,
    magicChecks,
    widgetChecks,
    emptyRunChecks,
    untouchedBlocks,
    appliedOpCount: applied,
  }
}

function textOf(node: Record<string, unknown>): string | undefined {
  if (Array.isArray(node['children'])) {
    return (node['children'] as Array<Record<string, unknown>>)
      .map((child) =>
        typeof child['text'] === 'string' ? (child['text'] as string) : '',
      )
      .join('')
  }
  if (typeof node['code'] === 'string') {
    return node['code'] as string
  }
  if (typeof node['note'] === 'string') {
    return node['note'] as string
  }
  return undefined
}

function findOwningNode(
  result: ReadonlyArray<Record<string, unknown>>,
  word: string,
): Record<string, unknown> | undefined {
  return result.find((node) => {
    const text = textOf(node)
    return typeof text === 'string' && text.includes(word)
  })
}

function findOwningSpan(
  node: Record<string, unknown>,
  word: string,
): Record<string, unknown> | undefined {
  const children = node['children']
  if (!Array.isArray(children)) {
    return undefined
  }
  return (children as Array<Record<string, unknown>>).find(
    (child) =>
      typeof child['text'] === 'string' &&
      (child['text'] as string).includes(word),
  )
}

function collectAllKeys(value: unknown, keys: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectAllKeys(item, keys)
    }
    return
  }
  if (typeof value === 'object' && value !== null) {
    for (const [field, fieldValue] of Object.entries(value)) {
      if (field === '_key' && typeof fieldValue === 'string') {
        keys.add(fieldValue)
      } else {
        collectAllKeys(fieldValue, keys)
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

/**
 * The ownership oracle: checks the algorithm's output against the
 * model built alongside the scripted edits, never against the
 * algorithm's own reasoning. Every assertion here failing on real
 * input is a finding, not a model bug, unless noted otherwise in the
 * findings report.
 */
function assertOwnership(
  caseData: CaseData,
  result: ReadonlyArray<Record<string, unknown>>,
): void {
  for (const [word, expectedKey] of caseData.blockKeyByWord) {
    const node = findOwningNode(result, word)
    expect(
      node?.['_key'],
      `sentinel "${word}" should sit on block "${expectedKey}"`,
    ).toBe(expectedKey)
  }

  for (const word of caseData.freshWords) {
    const node = findOwningNode(result, word)
    expect(
      node?.['_key'],
      `fresh sentinel "${word}" should be present`,
    ).not.toBe(undefined)
    expect(
      caseData.storedKeySet.has(node?.['_key'] as string),
      `fresh sentinel "${word}" should not carry a stored key`,
    ).toBe(false)
  }

  const resultKeys = new Set<string>()
  collectAllKeys(result, resultKeys)
  for (const key of caseData.removedAnyKeys) {
    expect(
      resultKeys.has(key),
      `removed key "${key}" should not appear anywhere`,
    ).toBe(false)
  }

  for (const check of caseData.linkChecks) {
    const node = findOwningNode(result, check.word) ?? {}
    const span = findOwningSpan(node, check.word) ?? {}
    expect(
      span['text'],
      `link sentinel "${check.word}" should resolve to a span`,
    ).not.toBe(undefined)
    const markDefs = node['markDefs']
    const marks = span['marks']
    const linkDef = Array.isArray(markDefs)
      ? (markDefs as Array<Record<string, unknown>>).find(
          (def) =>
            Array.isArray(marks) &&
            marks.includes(def['_key']) &&
            def['_type'] === 'link',
        )
      : undefined
    expect(
      linkDef?.['href'],
      `sentinel "${check.word}" should resolve through marks to a link with href "${check.href}"`,
    ).toBe(check.href)
    expect(linkDef?.['_key']).toBe(check.expectedDefKey)
  }

  for (const check of caseData.magicChecks) {
    const node = findOwningNode(result, check.word)
    expect(
      node?.['magic'],
      `magic sentinel "${check.word}" should carry "${check.expectedMagic}"`,
    ).toBe(check.expectedMagic)
  }

  for (const check of caseData.widgetChecks) {
    const node = findOwningNode(result, check.word)
    expect(
      node?.['_key'],
      `widget sentinel "${check.word}" should be present`,
    ).toBe(check.expectedKey)
    expect(node?.['note']).toBe(check.expectedNote)
  }

  for (const run of caseData.emptyRunChecks) {
    for (const block of run.blocks) {
      const node = result.find((n) => n['_key'] === block.blockKey)
      expect(node).toEqual({
        _type: 'block',
        _key: block.blockKey,
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: block.spanKey, text: block.text, marks: []},
        ],
      })
    }
  }

  for (const [key, storedBlock] of caseData.untouchedBlocks) {
    const node = result.find((n) => n['_key'] === key)
    expect(
      node,
      `untouched block "${key}" should come back exactly as stored`,
    ).toEqual(storedBlock)
  }
}

function runCase(caseData: CaseData): Array<PortableTextBlock> {
  return applyMarkdownEdit(caseData.stored, caseData.editedMarkdown, {
    schema,
    deserialize: {keyGenerator: createTestKeyGenerator()},
  }) as unknown as Array<PortableTextBlock>
}

describe('applyMarkdownEdit ownership (seeded model-based fuzz)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const CASES_PER_SEED = 30

  test.each(SEEDS)('seed %i', (seed) => {
    const random = mulberry32(seed)

    for (let caseIndex = 0; caseIndex < CASES_PER_SEED; caseIndex++) {
      const caseId = seed * 1000 + caseIndex
      const caseData = buildCase(random, caseId)
      const storedSnapshot = structuredClone(caseData.stored)

      const result = runCase(caseData)

      assertOwnership(
        caseData,
        result as unknown as Array<Record<string, unknown>>,
      )
      assertSiblingKeysUnique(result)

      // Inputs are never mutated.
      expect(caseData.stored).toEqual(storedSnapshot)

      // Determinism: same inputs, same output.
      const again = applyMarkdownEdit(storedSnapshot, caseData.editedMarkdown, {
        schema,
        deserialize: {keyGenerator: createTestKeyGenerator()},
      })
      expect(again).toEqual(result)
    }
  })

  test('the oracle rejects a swapped-key corruption of a real result (falsifiability)', () => {
    const random = mulberry32(4242)
    const caseData = buildCase(random, 4242_000)
    const result = runCase(caseData) as unknown as Array<
      Record<string, unknown>
    >

    // The real result passes.
    assertOwnership(caseData, result)

    const corrupted = structuredClone(result)
    expect(corrupted.length).toBeGreaterThanOrEqual(2)
    const firstKey = corrupted[0]!['_key']
    corrupted[0]!['_key'] = corrupted[1]!['_key']
    corrupted[1]!['_key'] = firstKey

    expect(() => assertOwnership(caseData, corrupted)).toThrow()
  })
})

const LARGE_CAMPAIGN_SIZE = Number(process.env['OWNERSHIP_FUZZ_CASES'] ?? 0)

test.skipIf(LARGE_CAMPAIGN_SIZE <= 0)(
  'applyMarkdownEdit ownership large campaign (OWNERSHIP_FUZZ_CASES)',
  () => {
    const random = mulberry32(424242)
    for (let index = 0; index < LARGE_CAMPAIGN_SIZE; index++) {
      const caseData = buildCase(random, 424242_000 + index)
      const storedSnapshot = structuredClone(caseData.stored)
      const result = runCase(caseData)
      assertOwnership(
        caseData,
        result as unknown as Array<Record<string, unknown>>,
      )
      assertSiblingKeysUnique(result)
      expect(caseData.stored).toEqual(storedSnapshot)
    }
  },
)
