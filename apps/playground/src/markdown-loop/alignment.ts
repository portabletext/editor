import type {EditorSchema, PortableTextBlock} from '@portabletext/editor'
import {portableTextToMarkdown} from '@portabletext/markdown'
import {makeDiff, type Diff} from '@sanity/diff-match-patch'
import {isEmptyTextBlock} from './empty-block'

/**
 * Past this many blocks per side, `makeDiff`'s token string would need one
 * character per distinct block form and the card's letters stop being
 * skimmable anyway: `computeAlignmentView` refuses instead of drawing a
 * diff nobody could read.
 */
const MAX_BLOCKS_PER_SIDE = 60

export type AlignmentToken = {
  letter: string
  amber: boolean
  /**
   * `letter` plus its occurrence count within the row (`A#0`, `B#0`,
   * `A#1`): a real alignment repeats letters for repeated block
   * content, so the letter alone cannot key a rendered list.
   */
  id: string
}

/**
 * A row position: a real block that took part in the diff, or a ghost
 * standing in for an empty block the diff never saw (see
 * `isEmptyTextBlock`). Ghosts carry no letter and pair with nothing.
 */
export type AlignmentRowItem =
  | ({kind: 'token'} & AlignmentToken)
  | {kind: 'ghost'}

/**
 * The diff's runs, translated back into blocks: an anchor is a stretch
 * of equal blocks that adopt in place, a gap pairs a deleted stretch
 * against the insertion right after it, and `added`/`removed` are the
 * leftovers with nothing on the other side.
 */
export type AlignmentRun =
  | {kind: 'anchor'; letters: ReadonlyArray<string>}
  | {
      kind: 'gap'
      removedLetters: ReadonlyArray<string>
      addedLetters: ReadonlyArray<string>
    }
  | {kind: 'added'; letters: ReadonlyArray<string>}
  | {kind: 'removed'; letters: ReadonlyArray<string>}

export type AlignmentSummary = {
  settledCount: number
  changedStretchCount: number
  onlyInEditCount: number
  removedCount: number
}

export type AlignmentView =
  | {
      status: 'ok'
      tidied: ReadonlyArray<AlignmentRowItem>
      edited: ReadonlyArray<AlignmentRowItem>
      summary: AlignmentSummary
      runs: ReadonlyArray<AlignmentRun>
      distinctFormCount: number
    }
  | {status: 'too-large'}

/**
 * Mirrors `apply-markdown-edit.ts`'s `MAX_DISTINCT_BLOCK_FORMS`: past
 * this many distinct block forms the real algorithm's token alphabet
 * would wrap into surrogate territory, so it refuses and mints every
 * key fresh instead. Not imported, since the package does not export
 * it; kept here as the single number the ceiling meter reads.
 */
export const MAX_DISTINCT_BLOCK_FORMS = 55_000

/**
 * Strips ghosts, for consumers that only ever wanted the real tokens
 * (the reconciliation dialog's letter strip does not visualize the
 * empty-block disclosure the Alignment tab does).
 */
export function alignmentTokens(
  row: ReadonlyArray<AlignmentRowItem>,
): Array<AlignmentToken> {
  return row.flatMap((item) =>
    item.kind === 'token'
      ? [{letter: item.letter, amber: item.amber, id: item.id}]
      : [],
  )
}

/**
 * One letter per distinct block content, tidied copy first: a letter
 * diff of the two sequences is the same alignment `applyMarkdownEdit`
 * itself draws before adopting keys, just rendered for a person instead
 * of consumed by the reconciler.
 */
export function computeAlignmentView(
  tidied: ReadonlyArray<PortableTextBlock>,
  edited: ReadonlyArray<PortableTextBlock>,
  schema: EditorSchema,
): AlignmentView {
  if (
    tidied.length > MAX_BLOCKS_PER_SIDE ||
    edited.length > MAX_BLOCKS_PER_SIDE
  ) {
    return {status: 'too-large'}
  }

  const nonEmptyTidied = tidied.filter(
    (block) => !isEmptyTextBlock(block, schema),
  )
  const nonEmptyEdited = edited.filter(
    (block) => !isEmptyTextBlock(block, schema),
  )

  const tokenBySignature = new Map<string, string>()
  const letterBySignature = new Map<string, string>()
  let nextIndex = 0
  const tokenFor = (signature: string): string => {
    let token = tokenBySignature.get(signature)
    if (token === undefined) {
      token = String.fromCharCode(0x100 + nextIndex)
      tokenBySignature.set(signature, token)
      letterBySignature.set(signature, spreadsheetLetter(nextIndex))
      nextIndex++
    }
    return token
  }

  const tidiedSignatures = nonEmptyTidied.map((block) =>
    blockSignature(block, schema),
  )
  const editedSignatures = nonEmptyEdited.map((block) =>
    blockSignature(block, schema),
  )
  const tidiedTokens = tidiedSignatures.map(tokenFor).join('')
  const editedTokens = editedSignatures.map(tokenFor).join('')

  const diffs = mergeAdjacentOps(
    makeDiff(tidiedTokens, editedTokens, {checkLines: false}),
  )

  const tidiedTokenRow: Array<AlignmentToken> = []
  const editedTokenRow: Array<AlignmentToken> = []
  // Each row gets its own occurrence counter: the tidied and edited rows
  // render as separate lists, so an id only has to be unique within its
  // own row, not across both.
  const tidiedOccurrenceByLetter = new Map<string, number>()
  const editedOccurrenceByLetter = new Map<string, number>()
  const idFor = (
    occurrenceByLetter: Map<string, number>,
    letter: string,
  ): string => {
    const occurrence = occurrenceByLetter.get(letter) ?? 0
    occurrenceByLetter.set(letter, occurrence + 1)
    return `${letter}#${occurrence}`
  }
  const runs: Array<AlignmentRun> = []
  let settledCount = 0
  let changedStretchCount = 0
  let onlyInEditCount = 0
  let removedCount = 0
  let tidiedIndex = 0
  let editedIndex = 0
  // Letters of a deletion still waiting for a matching insertion:
  // adjacent delete-then-insert is one gap, an equal run in between
  // means the deletion never got one and stands alone as removed.
  let pendingRemovedLetters: Array<string> | null = null

  for (const [operation, text] of diffs) {
    if (operation === 0) {
      if (pendingRemovedLetters) {
        runs.push({kind: 'removed', letters: pendingRemovedLetters})
        removedCount += pendingRemovedLetters.length
        pendingRemovedLetters = null
      }
      const letters: Array<string> = []
      for (let offset = 0; offset < text.length; offset++) {
        const letter = letterBySignature.get(tidiedSignatures[tidiedIndex]!)!
        tidiedTokenRow.push({
          letter,
          amber: false,
          id: idFor(tidiedOccurrenceByLetter, letter),
        })
        editedTokenRow.push({
          letter,
          amber: false,
          id: idFor(editedOccurrenceByLetter, letter),
        })
        letters.push(letter)
        settledCount++
        tidiedIndex++
        editedIndex++
      }
      runs.push({kind: 'anchor', letters})
      continue
    }

    if (operation === -1) {
      const letters: Array<string> = []
      for (let offset = 0; offset < text.length; offset++) {
        const letter = letterBySignature.get(tidiedSignatures[tidiedIndex]!)!
        tidiedTokenRow.push({
          letter,
          amber: true,
          id: idFor(tidiedOccurrenceByLetter, letter),
        })
        letters.push(letter)
        tidiedIndex++
      }
      pendingRemovedLetters = letters
      continue
    }

    const letters: Array<string> = []
    for (let offset = 0; offset < text.length; offset++) {
      const letter = letterBySignature.get(editedSignatures[editedIndex]!)!
      editedTokenRow.push({
        letter,
        amber: true,
        id: idFor(editedOccurrenceByLetter, letter),
      })
      letters.push(letter)
      editedIndex++
    }
    if (pendingRemovedLetters) {
      runs.push({
        kind: 'gap',
        removedLetters: pendingRemovedLetters,
        addedLetters: letters,
      })
      changedStretchCount++
      pendingRemovedLetters = null
    } else {
      runs.push({kind: 'added', letters})
      onlyInEditCount += letters.length
    }
  }

  if (pendingRemovedLetters) {
    runs.push({kind: 'removed', letters: pendingRemovedLetters})
    removedCount += pendingRemovedLetters.length
  }

  return {
    status: 'ok',
    tidied: withGhosts(tidied, tidiedTokenRow, schema),
    edited: withGhosts(edited, editedTokenRow, schema),
    summary: {settledCount, changedStretchCount, onlyInEditCount, removedCount},
    runs,
    distinctFormCount: nextIndex,
  }
}

/**
 * Re-threads the real tokens back through the block sequence they came
 * from, standing in a ghost wherever a block was empty and never
 * reached the diff at all. `tokens` is already in the same relative
 * order as `original`'s non-empty blocks, since `tidiedIndex` and
 * `editedIndex` advance monotonically over exactly that subsequence.
 */
function withGhosts(
  original: ReadonlyArray<PortableTextBlock>,
  tokens: ReadonlyArray<AlignmentToken>,
  schema: EditorSchema,
): Array<AlignmentRowItem> {
  const row: Array<AlignmentRowItem> = []
  let tokenIndex = 0
  for (const block of original) {
    if (isEmptyTextBlock(block, schema)) {
      row.push({kind: 'ghost'})
    } else {
      const token = tokens[tokenIndex]!
      row.push({
        kind: 'token',
        letter: token.letter,
        amber: token.amber,
        id: token.id,
      })
      tokenIndex++
    }
  }
  return row
}

/**
 * `_type` plus the block's own markdown, `_key`s canonicalized first: two
 * blocks with the same content but different keys (a fresh parse next to
 * a stored copy, most of the time) must land on the same signature, and
 * `portableTextToMarkdown`'s `json:object` carrier path embeds the whole
 * node verbatim, `_key` included.
 */
function blockSignature(
  block: PortableTextBlock,
  schema: EditorSchema,
): string {
  const canonicalized = canonicalizeKeys(block) as PortableTextBlock
  return block._type + portableTextToMarkdown([canonicalized], {schema})
}

/**
 * Rewrites every `_key` in `value` to a value derived only from
 * first-appearance order, and follows `marks` arrays (the one place a
 * key is referenced rather than declared) so a span's marks still point
 * at its block's own rewritten `markDefs` keys. Two passes: the rewrite
 * pass needs every key mapped before it runs, and object field order is
 * not guaranteed to visit a markDef before the span that references it.
 */
function canonicalizeKeys(value: unknown): unknown {
  const keyMap = new Map<string, string>()
  let counter = 0

  collect(value)
  return rewrite(value)

  function collect(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) {
        collect(item)
      }
      return
    }
    if (node === null || typeof node !== 'object') {
      return
    }
    const record = node as Record<string, unknown>
    const key = record['_key']
    if (typeof key === 'string' && !keyMap.has(key)) {
      keyMap.set(key, `k${counter++}`)
    }
    for (const fieldValue of Object.values(record)) {
      collect(fieldValue)
    }
  }

  function rewrite(node: unknown): unknown {
    if (Array.isArray(node)) {
      return node.map(rewrite)
    }
    if (node === null || typeof node !== 'object') {
      return node
    }
    const record = node as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [field, fieldValue] of Object.entries(record)) {
      if (field === '_key' && typeof fieldValue === 'string') {
        result[field] = keyMap.get(fieldValue) ?? fieldValue
      } else if (field === 'marks' && Array.isArray(fieldValue)) {
        result[field] = fieldValue.map((mark) =>
          typeof mark === 'string' ? (keyMap.get(mark) ?? mark) : mark,
        )
      } else {
        result[field] = rewrite(fieldValue)
      }
    }
    return result
  }
}

/**
 * Spreadsheet column naming (`A`...`Z`, `AA`, `AB`...): a display label
 * decoupled from the single-character tokens `makeDiff` runs on, since
 * those run out of unique two-letter combinations long before 60 blocks.
 */
function spreadsheetLetter(index: number): string {
  let n = index + 1
  let label = ''
  while (n > 0) {
    n--
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26)
  }
  return label
}

function mergeAdjacentOps(diffs: ReadonlyArray<Diff>): Array<Diff> {
  const merged: Array<[number, string]> = []
  for (const [operation, text] of diffs) {
    const last = merged[merged.length - 1]
    if (last && last[0] === operation) {
      last[1] += text
    } else {
      merged.push([operation, text])
    }
  }
  return merged as Array<Diff>
}
