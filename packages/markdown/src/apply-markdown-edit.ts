import type {PortableTextBlock, Schema} from '@portabletext/schema'
import {cleanupEfficiency, makeDiff} from '@sanity/diff-match-patch'
import {portableTextToMarkdown} from './from-portable-text/portable-text-to-markdown'
import {defaultKeyGenerator} from './key-generator'
import {markdownToPortableText} from './to-portable-text/markdown-to-portable-text'

/**
 * @public
 */
export type ApplyMarkdownEditOptions = {
  /**
   * One compiled schema governing both conversion directions, the same
   * object the standalone converters accept. Taking it once is what
   * keeps the internal canonical dialect consistent: serializing and
   * reparsing under different schemas would change node counts or
   * types, refuse the origin trace, and reset keys document-wide.
   */
  schema?: Schema
  /**
   * Options for the markdown → Portable Text conversion of
   * `editedMarkdown` (matchers, `keyGenerator`). The same options
   * also govern the internal canonicalization of `storedPortableText`
   * used to align the two documents, except `onDegradation`, which is
   * scoped to `editedMarkdown` alone: `keyGenerator` supplies every
   * fresh key the function mints, both for new content and for the
   * sibling-uniqueness repair sweep.
   */
  deserialize?: Omit<
    NonNullable<Parameters<typeof markdownToPortableText>[1]>,
    'schema'
  >
  /**
   * Options for the Portable Text → markdown conversion. Pass the same
   * options that produced the markdown that was edited: reconciliation
   * aligns the edit against a fresh canonical serialization of
   * `storedPortableText`, so the two serializations must agree for
   * that alignment to be meaningful.
   */
  serialize?: Omit<
    NonNullable<Parameters<typeof portableTextToMarkdown>[1]>,
    'schema'
  >
}

/**
 * Deliberately high pending calibration against real agent edit
 * traces: a wrong match moves anchors onto unrelated text, a fresh
 * key resets one block.
 */
const MIN_BLOCK_SIMILARITY = 0.8

/**
 * Caps for the split, merge, and similarity tiers: above this many
 * pairs, or past this per-diff time, evidence gathering stops and the
 * affected blocks get new keys, the safe failure mode. Without the
 * caps a single large unequal gap of long unique texts is quadratic in
 * both concatenation search and similarity scoring, and runs for tens
 * of seconds.
 */
const MAX_SIMILARITY_PAIRS = 2500
const SIMILARITY_DIFF_TIMEOUT_SECONDS = 0.05

/**
 * Bounded attempts at a caller-supplied `keyGenerator` before falling
 * back to deterministic suffixing: a generator that always returns
 * the same value (a constant stub, a buggy sequence) would otherwise
 * spin the collision loop forever.
 */
const MAX_KEY_GENERATOR_ATTEMPTS = 3

/**
 * One block, one UTF-16 code unit: past this many distinct block
 * forms the token alphabet would wrap into collisions and surrogate
 * territory, so alignment gives up and every key stays fresh.
 */
const MAX_DISTINCT_BLOCK_FORMS = 55_000

/**
 * Converts edited markdown to Portable Text, restores stored keys, and
 * restores fields the markdown dialect cannot express (dropped by
 * serialization, so the edit could not have touched them); a field
 * markdown does express follows the edit. Keys aim for what the same
 * edit would have produced in an editor:
 * unchanged, moved, and rewritten-in-place content keeps its keys
 * (rewriting a paragraph in place keeps its identity, like typing over
 * it), a split keeps the key on its first non-empty fragment, a merge
 * keeps the first source block's key, and a `json:object` payload keeps
 * the key it carries, unless reconciliation matches it to stored
 * content, which takes the stored key even over a differing key in the
 * payload. When an insertion or deletion makes positions ambiguous,
 * only clear similarity evidence adopts a key and everything else gets
 * a new one; gathering that evidence is time-capped, so on very large
 * ambiguous edits the set of adopted keys can differ across machine
 * speeds, degrading toward fresh keys.
 * Output keys are unique among siblings. The function does not mutate
 * `storedPortableText` and returns a value, not patches. The `schema`
 * is taken once and governs both directions; pass the same `serialize`
 * options that produced the markdown that was edited. A throwing or
 * stateful custom matcher or renderer propagates or degrades matching
 * respectively.
 * Reconciliation never merges concurrent edits: compare the stored
 * field against the live document before writing the result back.
 * The trades in one line: same-position replacement inherits identity,
 * a count-preserving rewrite pairs positionally (block-level and
 * sibling-level alike), and evidence gathering is capped, degrading to
 * fresh keys.
 *
 * @public
 */
export function applyMarkdownEdit(
  storedPortableText: ReadonlyArray<PortableTextBlock>,
  editedMarkdown: string,
  options?: ApplyMarkdownEditOptions,
): Array<PortableTextBlock> {
  const result = structuredClone(
    markdownToPortableText(editedMarkdown, {
      ...options?.deserialize,
      schema: options?.schema,
    }),
  ) as unknown as Array<Node>
  const canonical = canonicalizeStored(storedPortableText, options)
  const originOf = traceOrigins(storedPortableText, canonical)
  const adoptedNodes: AdoptedNodes = new WeakSet()
  if (originOf) {
    const alignment = alignBlocks(canonical, result)
    if (alignment) {
      adoptAnchors(alignment.anchors, canonical, originOf, result, adoptedNodes)
      const gaps = adoptMoves(
        alignment.gaps,
        canonical,
        result,
        originOf,
        adoptedNodes,
      )
      for (const gap of gaps) {
        resolveGap(
          gap.storedIndexes,
          gap.editedIndexes,
          canonical,
          result,
          originOf,
          adoptedNodes,
        )
      }
    }
  }
  enforceSiblingKeyUniqueness(
    result,
    options?.deserialize?.keyGenerator ?? defaultKeyGenerator,
    adoptedNodes,
  )
  return result as unknown as Array<PortableTextBlock>
}

type Node = Record<string, unknown>

/**
 * Adoption targets, so the deduplication pass can tell an adopted
 * (authoritative) key from a verbatim payload duplicate.
 */
type AdoptedNodes = WeakSet<object>

/**
 * Re-expresses the stored value in the parser's dialect by serializing
 * it and parsing it right back: the parser merges same-mark sibling
 * spans, reorders marks, collapses list levels, and fills defaults, so
 * content the edit never touched only deep-equals its parsed
 * counterpart after both sides have been through the same round trip.
 * The replacement keys are positional (`__canonical_<n>`), so a match
 * against canonical node `n` can be traded back for stored node `n`'s
 * real `_key`.
 */
function canonicalizeStored(
  stored: ReadonlyArray<PortableTextBlock>,
  options: ApplyMarkdownEditOptions | undefined,
): Array<Node> {
  const storedClone = structuredClone(stored) as Array<PortableTextBlock>
  const storedMarkdown = portableTextToMarkdown(storedClone, {
    ...options?.serialize,
    schema: options?.schema,
  })
  const {onDegradation, ...canonicalDeserializeOptions} =
    options?.deserialize ?? {}
  let canonicalKeyCounter = 0
  return markdownToPortableText(storedMarkdown, {
    ...canonicalDeserializeOptions,
    schema: options?.schema,
    keyGenerator: () => `__canonical_${canonicalKeyCounter++}`,
  }) as unknown as Array<Node>
}

/**
 * Positional pairing between `stored` and `canonical` is only
 * trustworthy when serialization preserved the node count and the
 * type sequence; when it did not (heading hard-break splits, lossy
 * table normalization), no key can be traced back to its owner, so
 * nothing adopts.
 */
function traceOrigins(
  stored: ReadonlyArray<PortableTextBlock>,
  canonical: ReadonlyArray<Node>,
): ((canonicalIndex: number) => Node) | undefined {
  if (canonical.length !== stored.length) {
    return undefined
  }
  for (let index = 0; index < stored.length; index++) {
    if ((stored[index] as Node)['_type'] !== canonical[index]?.['_type']) {
      return undefined
    }
  }
  for (let index = 0; index < stored.length; index++) {
    const storedNode = stored[index] as unknown as Node
    const canonicalNode = canonical[index]!
    if (isTextBlock(storedNode) && isTextBlock(canonicalNode)) {
      if (blockText(storedNode).trim() !== blockText(canonicalNode).trim()) {
        // CommonMark trims whitespace on reparse, so text identity
        // compares trimmed text.
        return undefined
      }
    }
  }
  return (canonicalIndex: number): Node =>
    stored[canonicalIndex] as unknown as Node
}

type Anchor = {canonicalIndex: number; resultIndex: number}
type Gap = {storedIndexes: Array<number>; editedIndexes: Array<number>}

/**
 * Equal runs become anchor pairs (so repeated content pairs
 * first-to-first when adopted), and the delete/insert runs between
 * them form the gaps.
 */
function alignBlocks(
  canonical: ReadonlyArray<Node>,
  result: ReadonlyArray<Node>,
): {anchors: Array<Anchor>; gaps: Array<Gap>} | undefined {
  const tokenByNeutral = new Map<string, string>()
  const tokenOf = (node: Node): string => {
    const neutral = neutralForm(node)
    let token = tokenByNeutral.get(neutral)
    if (token === undefined) {
      token = String.fromCharCode(tokenByNeutral.size + 1)
      tokenByNeutral.set(neutral, token)
    }
    return token
  }
  const canonicalTokens = canonical.map(tokenOf).join('')
  const resultTokens = result.map(tokenOf).join('')
  if (tokenByNeutral.size > MAX_DISTINCT_BLOCK_FORMS) {
    return undefined
  }
  // The tenth distinct block form draws `'\n'` as its token, and past
  // 100 tokens per side `makeDiff`'s line-mode heuristic would split on
  // it, making alignment shape depend on which block form drew that
  // character. Blocks are already atomic, so line mode adds nothing.
  const diffs = makeDiff(canonicalTokens, resultTokens, {checkLines: false})

  const anchors: Array<Anchor> = []
  const gaps: Array<Gap> = []
  let gap: Gap = {storedIndexes: [], editedIndexes: []}
  const flushGap = () => {
    if (gap.storedIndexes.length > 0 || gap.editedIndexes.length > 0) {
      gaps.push(gap)
      gap = {storedIndexes: [], editedIndexes: []}
    }
  }

  let canonicalIndex = 0
  let resultIndex = 0
  for (const [operation, text] of diffs) {
    if (operation === 0) {
      flushGap()
      for (let offset = 0; offset < text.length; offset++) {
        anchors.push({canonicalIndex, resultIndex})
        canonicalIndex++
        resultIndex++
      }
    } else if (operation === -1) {
      for (let offset = 0; offset < text.length; offset++) {
        gap.storedIndexes.push(canonicalIndex++)
      }
    } else {
      for (let offset = 0; offset < text.length; offset++) {
        gap.editedIndexes.push(resultIndex++)
      }
    }
  }
  flushGap()

  return {anchors, gaps}
}

function adoptAnchors(
  anchors: ReadonlyArray<Anchor>,
  canonical: ReadonlyArray<Node>,
  originOf: (canonicalIndex: number) => Node,
  result: ReadonlyArray<Node>,
  adoptedNodes: AdoptedNodes,
): void {
  for (const anchor of anchors) {
    adoptNode(
      originOf(anchor.canonicalIndex),
      canonical[anchor.canonicalIndex],
      result[anchor.resultIndex]!,
      adoptedNodes,
    )
  }
}

/**
 * Moves: content that left one gap and reappeared in another. Unique
 * exact pairs across all gaps adopt before any gap-local pairing can
 * consume the keys they need.
 */
function adoptMoves(
  gaps: ReadonlyArray<Gap>,
  canonical: ReadonlyArray<Node>,
  result: ReadonlyArray<Node>,
  originOf: (canonicalIndex: number) => Node,
  adoptedNodes: AdoptedNodes,
): Array<Gap> {
  const consumedStored = new Set<number>()
  const consumedEdited = new Set<number>()
  const storedLeftovers = gaps.flatMap((g) => g.storedIndexes)
  const editedLeftovers = gaps.flatMap((g) => g.editedIndexes)
  const storedByNeutral = new Map<string, Array<number>>()
  for (const index of storedLeftovers) {
    const neutral = neutralForm(canonical[index]!)
    storedByNeutral.set(neutral, [
      ...(storedByNeutral.get(neutral) ?? []),
      index,
    ])
  }
  const editedByNeutral = new Map<string, Array<number>>()
  for (const index of editedLeftovers) {
    const neutral = neutralForm(result[index]!)
    editedByNeutral.set(neutral, [
      ...(editedByNeutral.get(neutral) ?? []),
      index,
    ])
  }
  for (const [neutral, storedIndexes] of storedByNeutral) {
    const editedIndexes = editedByNeutral.get(neutral)
    if (
      storedIndexes.length !== 1 ||
      !editedIndexes ||
      editedIndexes.length !== 1
    ) {
      continue
    }
    consumedStored.add(storedIndexes[0]!)
    consumedEdited.add(editedIndexes[0]!)
    adoptNode(
      originOf(storedIndexes[0]!),
      canonical[storedIndexes[0]!],
      result[editedIndexes[0]!]!,
      adoptedNodes,
    )
  }

  return gaps.map((currentGap) => ({
    storedIndexes: currentGap.storedIndexes.filter(
      (index) => !consumedStored.has(index),
    ),
    editedIndexes: currentGap.editedIndexes.filter(
      (index) => !consumedEdited.has(index),
    ),
  }))
}

/**
 * Gap policy, in order: split/merge survivor (the first fragment or
 * first source block keeps the key, matching what pressing enter or
 * backspace does in the editor), positional zip for equal counts
 * (typing over a paragraph keeps its identity), similarity for
 * unequal counts (an insertion or deletion shifted positions, so
 * position lies and only mutual unique best evidence adopts).
 */
function resolveGap(
  storedIndexes: Array<number>,
  editedIndexes: Array<number>,
  canonical: ReadonlyArray<Node>,
  result: ReadonlyArray<Node>,
  originOf: (canonicalIndex: number) => Node,
  adoptedNodes: AdoptedNodes,
): void {
  const remainingStored = new Set(storedIndexes)
  const remainingEdited = new Set(editedIndexes)

  // The concatenation search below is quadratic in the gap's size, so
  // it shares the similarity tier's pair cap: past it, splits and
  // merges get skipped too rather than adopted at tens-of-seconds cost.
  const withinConcatenationCap =
    storedIndexes.length * editedIndexes.length <= MAX_SIMILARITY_PAIRS

  // Splits: one stored block's text equals the concatenation of
  // adjacent edited blocks.
  if (withinConcatenationCap) {
    for (const storedIndex of storedIndexes) {
      if (!remainingStored.has(storedIndex)) {
        continue
      }
      const storedBlock = canonical[storedIndex]!
      if (!isTextBlock(storedBlock)) {
        continue
      }
      const fragments = findConcatenation(
        blockText(storedBlock),
        editedIndexes.filter((index) => remainingEdited.has(index)),
        result,
      )
      if (fragments) {
        remainingStored.delete(storedIndex)
        for (const fragment of fragments) {
          remainingEdited.delete(fragment)
        }
        const survivor =
          fragments.find(
            (fragment) => blockText(result[fragment]!).length > 0,
          ) ?? fragments[0]!
        adoptNode(
          originOf(storedIndex),
          canonical[storedIndex],
          result[survivor]!,
          adoptedNodes,
        )
      }
    }
  }

  // Merges: one edited block's text equals the concatenation of
  // adjacent stored blocks. The first source block survives.
  if (withinConcatenationCap) {
    for (const editedIndex of editedIndexes) {
      if (!remainingEdited.has(editedIndex)) {
        continue
      }
      const editedBlock = result[editedIndex]!
      if (!isTextBlock(editedBlock)) {
        continue
      }
      const sources = findConcatenation(
        blockText(editedBlock),
        storedIndexes.filter((index) => remainingStored.has(index)),
        canonical,
      )
      if (sources) {
        remainingEdited.delete(editedIndex)
        for (const source of sources) {
          remainingStored.delete(source)
        }
        adoptNode(
          originOf(sources[0]!),
          canonical[sources[0]!],
          result[editedIndex]!,
          adoptedNodes,
        )
      }
    }
  }

  const storedRest = [...remainingStored]
  const editedRest = [...remainingEdited]

  if (storedRest.length === editedRest.length) {
    for (let offset = 0; offset < storedRest.length; offset++) {
      const storedBlock = canonical[storedRest[offset]!]!
      const editedBlock = result[editedRest[offset]!]!
      if (storedBlock['_type'] === editedBlock['_type']) {
        adoptNode(
          originOf(storedRest[offset]!),
          canonical[storedRest[offset]!],
          editedBlock,
          adoptedNodes,
        )
      }
    }
    return
  }

  if (storedRest.length * editedRest.length > MAX_SIMILARITY_PAIRS) {
    return
  }

  const scores = new Map<string, number>()
  for (const storedIndex of storedRest) {
    for (const editedIndex of editedRest) {
      const score = blockSimilarity(
        canonical[storedIndex]!,
        result[editedIndex]!,
      )
      if (score >= MIN_BLOCK_SIMILARITY) {
        scores.set(`${storedIndex}:${editedIndex}`, score)
      }
    }
  }
  for (const storedIndex of storedRest) {
    const best = uniqueBest(editedRest, (editedIndex) =>
      scores.get(`${storedIndex}:${editedIndex}`),
    )
    if (best === undefined) {
      continue
    }
    const bestBack = uniqueBest(storedRest, (otherStoredIndex) =>
      scores.get(`${otherStoredIndex}:${best}`),
    )
    if (bestBack !== storedIndex) {
      continue
    }
    adoptNode(
      originOf(storedIndex),
      canonical[storedIndex],
      result[best]!,
      adoptedNodes,
    )
  }
}

/**
 * Fragments join with nothing or a single space, since a markdown
 * merge is often a soft-wrap join that inserts one ("alpha\nbeta"
 * parses to "alpha beta").
 */
function findConcatenation(
  wholeText: string,
  candidateIndexes: Array<number>,
  nodes: ReadonlyArray<Node>,
): Array<number> | undefined {
  if (wholeText.length === 0) {
    return undefined
  }
  for (const joiner of ['', ' ']) {
    for (let start = 0; start < candidateIndexes.length; start++) {
      let concatenated = ''
      const used: Array<number> = []
      for (
        let position = start;
        position < candidateIndexes.length;
        position++
      ) {
        const index = candidateIndexes[position]!
        if (position > start && candidateIndexes[position - 1] !== index - 1) {
          break
        }
        if (!isTextBlock(nodes[index]!)) {
          break
        }
        concatenated =
          used.length === 0
            ? blockText(nodes[index]!)
            : concatenated + joiner + blockText(nodes[index]!)
        used.push(index)
        if (concatenated.length > wholeText.length) {
          break
        }
        if (concatenated === wholeText && used.length > 1) {
          return used
        }
      }
    }
  }
  return undefined
}

/**
 * Adopts the original node's `_key`, its markdown-inexpressible
 * fields, then its `markDefs` before its other keyed children, since
 * `span.marks` references need the adopted `markDefs` keys already in
 * place.
 */
function adoptNode(
  original: Node,
  canonicalCounterpart: Node | undefined,
  target: Node,
  adoptedNodes: AdoptedNodes,
): void {
  adoptedNodes.add(target)
  if (typeof original['_key'] === 'string') {
    target['_key'] = original['_key']
  }

  restoreFields(original, canonicalCounterpart, target)

  const markDefKeyMap = adoptMarkDefs(original, canonicalCounterpart, target)
  rewriteMarkReferences(target, markDefKeyMap)

  for (const field of Object.keys(target)) {
    if (field === 'markDefs') {
      continue
    }
    const originalChildren = original[field]
    const targetChildren = target[field]
    if (
      !isTypedObjectArray(originalChildren) ||
      !isTypedObjectArray(targetChildren)
    ) {
      continue
    }
    const canonicalChildren = canonicalChildArray(
      canonicalCounterpart,
      field,
      originalChildren,
    )

    const matchedOriginal = new Set<number>()
    const matchedTarget = new Set<number>()
    // Children reference their parent block's `markDefs`, so their
    // neutral forms alias marks against the parent, not themselves.
    const originalGroups = groupByNeutralForm(
      originalChildren,
      matchedOriginal,
      buildAliasMap(original),
    )
    const targetGroups = groupByNeutralForm(
      targetChildren,
      matchedTarget,
      buildAliasMap(target),
    )

    for (const [neutral, originalIndexes] of originalGroups) {
      const targetIndexes = targetGroups.get(neutral)
      if (
        originalIndexes.length !== 1 ||
        !targetIndexes ||
        targetIndexes.length !== 1
      ) {
        continue
      }
      matchedOriginal.add(originalIndexes[0]!)
      matchedTarget.add(targetIndexes[0]!)
      adoptNode(
        originalChildren[originalIndexes[0]!]!,
        canonicalChildren?.[originalIndexes[0]!],
        targetChildren[targetIndexes[0]!]!,
        adoptedNodes,
      )
    }

    // The concatenation search is quadratic in the block's span count,
    // so it shares the similarity tier's pair cap: past it, the merge
    // search is skipped and the unmatched spans fall through to fresh
    // keys rather than adopting at tens-of-seconds cost.
    if (
      field === 'children' &&
      originalChildren.length * targetChildren.length <= MAX_SIMILARITY_PAIRS
    ) {
      adoptMergedSpans(
        originalChildren,
        canonicalChildren,
        matchedOriginal,
        targetChildren,
        matchedTarget,
        adoptedNodes,
      )
    }

    adoptResidualZip(
      originalChildren,
      canonicalChildren,
      matchedOriginal,
      targetChildren,
      matchedTarget,
      adoptedNodes,
    )
  }
}

/**
 * The container-level counterpart of `traceOrigins`'s guard: a
 * child's canonical form is only trustworthy when the canonical
 * container holds the same field as the same typed object array,
 * equal in length and `_type` sequence to the original's, so pairing
 * by index (original child `i` to canonical child `i`) means the same
 * content on both sides.
 */
function canonicalChildArray(
  canonicalCounterpart: Node | undefined,
  field: string,
  originalChildren: ReadonlyArray<Node>,
): Array<Node> | undefined {
  if (!canonicalCounterpart) {
    return undefined
  }
  const candidate = canonicalCounterpart[field]
  if (
    !isTypedObjectArray(candidate) ||
    candidate.length !== originalChildren.length
  ) {
    return undefined
  }
  for (let index = 0; index < originalChildren.length; index++) {
    if (originalChildren[index]!['_type'] !== candidate[index]!['_type']) {
      return undefined
    }
  }
  return candidate
}

/**
 * Restores fields the markdown dialect dropped: present on the
 * original, absent from its canonical round trip (so serialization
 * never gave the edit a chance to touch it), and absent from the
 * parsed target (a carrier payload or the parse itself already
 * supplied it authoritatively). Restored values are cloned, since the
 * sibling-key-uniqueness pass may rewrite `_key`s inside a restored
 * array of objects, and the original must stay untouched.
 */
function restoreFields(
  original: Node,
  canonicalCounterpart: Node | undefined,
  target: Node,
): void {
  if (!canonicalCounterpart) {
    return
  }
  for (const field of Object.keys(original)) {
    if (field === '_key' || field === 'markDefs') {
      continue
    }
    if (Object.hasOwn(canonicalCounterpart, field)) {
      continue
    }
    if (Object.hasOwn(target, field)) {
      continue
    }
    target[field] = structuredClone(original[field])
  }
}

/**
 * A span in the edited output can be the merge of several stored
 * spans: the parser merges adjacent same-mark spans, and an edit that
 * removes formatting merges across the old mark boundary too. Matching
 * is by text alone, and the first contributor's key survives, matching
 * the editor's own span-merge normalization.
 */
function adoptMergedSpans(
  originalChildren: ReadonlyArray<Node>,
  canonicalChildren: ReadonlyArray<Node> | undefined,
  matchedOriginal: Set<number>,
  targetChildren: ReadonlyArray<Node>,
  matchedTarget: Set<number>,
  adoptedNodes: AdoptedNodes,
): void {
  for (
    let targetIndex = 0;
    targetIndex < targetChildren.length;
    targetIndex++
  ) {
    if (matchedTarget.has(targetIndex)) {
      continue
    }
    const targetSpan = targetChildren[targetIndex]!
    const targetText = targetSpan['text']
    if (typeof targetText !== 'string') {
      continue
    }

    for (let start = 0; start < originalChildren.length; start++) {
      if (matchedOriginal.has(start)) {
        continue
      }
      let concatenated = ''
      const used: Array<number> = []
      for (let index = start; index < originalChildren.length; index++) {
        if (matchedOriginal.has(index)) {
          break
        }
        const originalSpan = originalChildren[index]!
        if (typeof originalSpan['text'] !== 'string') {
          break
        }
        concatenated += originalSpan['text']
        used.push(index)
        if (concatenated.length > targetText.length) {
          break
        }
        if (concatenated === targetText && used.length > 1) {
          matchedTarget.add(targetIndex)
          for (const usedIndex of used) {
            matchedOriginal.add(usedIndex)
          }
          adoptNode(
            originalChildren[used[0]!]!,
            canonicalChildren?.[used[0]!],
            targetSpan,
            adoptedNodes,
          )
          break
        }
      }
      if (matchedTarget.has(targetIndex)) {
        break
      }
    }
  }
}

/**
 * The equal-count residual rule, mirroring `resolveGap`'s positional
 * zip: elements left unmatched after neutral-form (and, for
 * `children`, span-merge) matching are treated as in-place edits when
 * both sides leave the same count, position being the same evidence
 * the block-level zip already trusts, and the trade is the same too:
 * a reorder-plus-edit with balanced counts mispairs. Unequal counts
 * adopt nothing, since position no longer lines up.
 */
function adoptResidualZip(
  originalChildren: ReadonlyArray<Node>,
  canonicalChildren: ReadonlyArray<Node> | undefined,
  matchedOriginal: ReadonlySet<number>,
  targetChildren: ReadonlyArray<Node>,
  matchedTarget: ReadonlySet<number>,
  adoptedNodes: AdoptedNodes,
): void {
  const originalRest = originalChildren
    .map((node, index) => ({node, index}))
    .filter(({index}) => !matchedOriginal.has(index))
  const targetRest = targetChildren.filter(
    (_, index) => !matchedTarget.has(index),
  )
  if (originalRest.length !== targetRest.length) {
    return
  }
  for (let offset = 0; offset < originalRest.length; offset++) {
    const originalNode = originalRest[offset]!.node
    const targetNode = targetRest[offset]!
    if (originalNode['_type'] === targetNode['_type']) {
      adoptNode(
        originalNode,
        canonicalChildren?.[originalRest[offset]!.index],
        targetNode,
        adoptedNodes,
      )
    }
  }
}

/**
 * Matches `markDefs` by definition content, `_key` excluded. Returns
 * the mapping from the target's fresh keys to the adopted stored
 * keys, for rewriting `span.marks` references.
 */
function adoptMarkDefs(
  original: Node,
  canonicalCounterpart: Node | undefined,
  target: Node,
): Map<string, string> {
  const keyMap = new Map<string, string>()
  const originalDefs = original['markDefs']
  const targetDefs = target['markDefs']
  if (!isTypedObjectArray(originalDefs) || !isTypedObjectArray(targetDefs)) {
    return keyMap
  }
  const canonicalDefs = canonicalChildArray(
    canonicalCounterpart,
    'markDefs',
    originalDefs,
  )

  const matchedOriginal = new Set<number>()
  const matchedTarget = new Set<number>()
  const originalGroups = groupByNeutralForm(originalDefs, matchedOriginal)
  const targetGroups = groupByNeutralForm(targetDefs, matchedTarget)

  const adoptDef = (
    originalDef: Node,
    canonicalDef: Node | undefined,
    targetDef: Node,
  ): void => {
    restoreFields(originalDef, canonicalDef, targetDef)
    if (
      typeof originalDef['_key'] === 'string' &&
      typeof targetDef['_key'] === 'string'
    ) {
      const adoptedKey = originalDef['_key']
      const collidesWithSibling = targetDefs.some(
        (def) => def !== targetDef && def['_key'] === adoptedKey,
      )
      if (collidesWithSibling) {
        return
      }
      keyMap.set(targetDef['_key'], adoptedKey)
      targetDef['_key'] = adoptedKey
    }
  }

  for (const [neutral, originalIndexes] of originalGroups) {
    const targetIndexes = targetGroups.get(neutral)
    if (!targetIndexes || targetIndexes.length !== originalIndexes.length) {
      continue
    }
    // Equal-count identical definitions pair in order, the repeated-content
    // policy: the definitions are content-equal, so no pairing can
    // mis-resolve a reference.
    for (let offset = 0; offset < originalIndexes.length; offset++) {
      matchedOriginal.add(originalIndexes[offset]!)
      matchedTarget.add(targetIndexes[offset]!)
      adoptDef(
        originalDefs[originalIndexes[offset]!]!,
        canonicalDefs?.[originalIndexes[offset]!],
        targetDefs[targetIndexes[offset]!]!,
      )
    }
  }

  const originalRest = originalDefs
    .map((node, index) => ({node, index}))
    .filter(({index}) => !matchedOriginal.has(index))
  const targetRest = targetDefs.filter((_, index) => !matchedTarget.has(index))
  if (
    originalRest.length === 1 &&
    targetRest.length === 1 &&
    originalRest[0]!.node['_type'] === targetRest[0]!['_type']
  ) {
    adoptDef(
      originalRest[0]!.node,
      canonicalDefs?.[originalRest[0]!.index],
      targetRest[0]!,
    )
  }

  return keyMap
}

function rewriteMarkReferences(block: Node, keyMap: Map<string, string>): void {
  if (keyMap.size === 0) {
    return
  }
  const children = block['children']
  if (!isTypedObjectArray(children)) {
    return
  }
  for (const child of children) {
    const marks = child['marks']
    if (!Array.isArray(marks)) {
      continue
    }
    child['marks'] = marks.map((mark) =>
      typeof mark === 'string' && keyMap.has(mark) ? keyMap.get(mark) : mark,
    )
  }
}

function groupByNeutralForm(
  nodes: ReadonlyArray<Node>,
  exclude: ReadonlySet<number>,
  aliasByKey?: Map<string, string>,
): Map<string, Array<number>> {
  const groups = new Map<string, Array<number>>()
  for (let index = 0; index < nodes.length; index++) {
    if (exclude.has(index)) {
      continue
    }
    const neutral = aliasByKey
      ? encodeNeutral(nodes[index]!, aliasByKey)
      : neutralForm(nodes[index]!)
    const group = groups.get(neutral)
    if (group) {
      group.push(index)
    } else {
      groups.set(neutral, [index])
    }
  }
  return groups
}

/**
 * A canonical JSON encoding that erases identity: `_key` properties
 * are dropped, object properties are sorted, and annotation `_key`
 * references inside `span.marks` are rewritten to the definition's
 * position in `markDefs` (dropping `_key` alone would compare the
 * stored annotation key against the fresh one and reject an unchanged
 * link).
 */
function neutralForm(node: Node): string {
  return encodeNeutral(node, buildAliasMap(node))
}

/**
 * Aliases each `markDefs` key to its definition's position, giving
 * `span.marks` references a key-independent spelling to compare by.
 */
function buildAliasMap(node: Node): Map<string, string> | undefined {
  const markDefs = node['markDefs']
  if (!isTypedObjectArray(markDefs)) {
    return undefined
  }
  const aliasByKey = new Map<string, string>()
  for (let index = 0; index < markDefs.length; index++) {
    const key = markDefs[index]!['_key']
    if (typeof key === 'string') {
      aliasByKey.set(key, `@annotation:${index}`)
    }
  }
  return aliasByKey
}

function encodeNeutral(
  value: unknown,
  aliasByKey: Map<string, string> | undefined,
): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => encodeNeutral(item, aliasByKey)).join(',')}]`
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Node)
      .filter(([field]) => field !== '_key')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([field, fieldValue]) => {
        if (field === 'marks' && aliasByKey && Array.isArray(fieldValue)) {
          const aliased = fieldValue.map((mark) =>
            typeof mark === 'string' && aliasByKey.has(mark)
              ? aliasByKey.get(mark)
              : mark,
          )
          return `${JSON.stringify(field)}:${JSON.stringify(aliased)}`
        }
        return `${JSON.stringify(field)}:${encodeNeutral(fieldValue, aliasByKey)}`
      })
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

const INLINE_OBJECT_SENTINEL = '\uFFFC'

/**
 * The block's comparison text: concatenated span text with inline
 * objects as sentinels. Marks are ignored, since a formatting-only
 * edit does not change textual identity.
 */
function blockText(block: Node): string {
  const children = block['children']
  if (!isTypedObjectArray(children)) {
    return ''
  }
  return children
    .map((child) =>
      typeof child['text'] === 'string'
        ? child['text']
        : INLINE_OBJECT_SENTINEL,
    )
    .join('')
}

/**
 * Text similarity in `[0, 1]`, gated to `0` unless the block shells
 * agree and the inline objects are compatible: however alike the
 * prose, blocks that disagree on structure are not the same block.
 * The length prescreen skips the diff when the size difference alone
 * puts the score under `MIN_BLOCK_SIMILARITY`.
 */
function blockSimilarity(canonicalBlock: Node, resultBlock: Node): number {
  if (!shellEquals(canonicalBlock, resultBlock)) {
    return 0
  }
  if (!inlineObjectsCompatible(canonicalBlock, resultBlock)) {
    return 0
  }
  const canonicalText = blockText(canonicalBlock)
  const resultText = blockText(resultBlock)
  if (canonicalText.length === 0 || resultText.length === 0) {
    return 0
  }
  const longer = Math.max(canonicalText.length, resultText.length)
  const lengthBound =
    1 - Math.abs(canonicalText.length - resultText.length) / longer
  if (lengthBound < MIN_BLOCK_SIMILARITY) {
    return 0
  }
  const diffs = cleanupEfficiency(
    makeDiff(canonicalText, resultText, {
      timeout: SIMILARITY_DIFF_TIMEOUT_SECONDS,
    }),
  )
  return 1 - levenshteinFromDiffs(diffs) / longer
}

/**
 * The distance derivation from diff runs: insertions and deletions
 * between equality runs accumulate as the larger of the two, so a
 * delete-plus-insert counts as one substitution.
 */
function levenshteinFromDiffs(diffs: ReadonlyArray<[number, string]>): number {
  let distance = 0
  let insertions = 0
  let deletions = 0
  for (const [operation, text] of diffs) {
    if (operation === 1) {
      insertions += text.length
    } else if (operation === -1) {
      deletions += text.length
    } else {
      distance += Math.max(insertions, deletions)
      insertions = 0
      deletions = 0
    }
  }
  return distance + Math.max(insertions, deletions)
}

/**
 * The block minus its content: `_type`, `style`, `listItem`, `level`,
 * and any custom fields must agree before text similarity means
 * anything.
 */
function shellEquals(a: Node, b: Node): boolean {
  const shellOf = (node: Node): string =>
    encodeNeutral(
      Object.fromEntries(
        Object.entries(node).filter(
          ([field]) => field !== 'children' && field !== 'markDefs',
        ),
      ),
      undefined,
    )
  return shellOf(a) === shellOf(b)
}

/**
 * Inline objects are opaque content: two blocks whose objects differ
 * are different blocks no matter how similar their prose is.
 */
function inlineObjectsCompatible(a: Node, b: Node): boolean {
  const objectsOf = (node: Node): Array<Node> => {
    const children = node['children']
    if (!isTypedObjectArray(children)) {
      return []
    }
    return children.filter((child) => typeof child['text'] !== 'string')
  }
  const aObjects = objectsOf(a)
  const bObjects = objectsOf(b)
  if (aObjects.length !== bObjects.length) {
    return false
  }
  return aObjects.every((aObject, index) => {
    const bObject = bObjects[index]!
    if (aObject['_type'] !== bObject['_type']) {
      return false
    }
    if (
      typeof aObject['_key'] === 'string' &&
      aObject['_key'] === bObject['_key']
    ) {
      return true
    }
    return neutralForm(aObject) === neutralForm(bObject)
  })
}

/**
 * The highest-scoring candidate, or `undefined` on a tie: a tie is
 * ambiguity, and ambiguity refuses adoption rather than guessing.
 */
function uniqueBest(
  candidates: ReadonlyArray<number>,
  scoreOf: (candidate: number) => number | undefined,
): number | undefined {
  let best: number | undefined
  let bestScore = 0
  let tied = false
  for (const candidate of candidates) {
    const score = scoreOf(candidate)
    if (score === undefined) {
      continue
    }
    if (score > bestScore) {
      best = candidate
      bestScore = score
      tied = false
    } else if (score === bestScore && best !== undefined) {
      tied = true
    }
  }
  return tied ? undefined : best
}

/**
 * Deliberately loose: any node with a `children` array reconciles like
 * a text block, custom block types included.
 */
function isTextBlock(node: Node): boolean {
  return Array.isArray(node['children'])
}

function isTypedObjectArray(value: unknown): value is Array<Node> {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Node)['_type'] === 'string',
    )
  )
}

/**
 * `json:object` payloads transport their `_key` verbatim, so a
 * copy-pasted fence puts the same key on two siblings, and everything
 * downstream (patches, anchors, editor normalization) assumes sibling
 * keys are unique. Adopted keys are authoritative, so a duplicate that
 * was adopted from the stored value wins and the other occurrences are
 * regenerated.
 */
function enforceSiblingKeyUniqueness(
  nodes: Array<Node>,
  keyGenerator: () => string,
  adoptedNodes: AdoptedNodes,
): void {
  const usedKeys = new Set<string>()

  const claim = (node: Node): void => {
    const key = node['_key']
    if (typeof key !== 'string') {
      return
    }
    if (usedKeys.has(key)) {
      let freshKey: string | undefined
      for (let attempt = 0; attempt < MAX_KEY_GENERATOR_ATTEMPTS; attempt++) {
        const candidate = keyGenerator()
        if (!usedKeys.has(candidate)) {
          freshKey = candidate
          break
        }
      }
      if (freshKey === undefined) {
        let suffix = 1
        let candidate = `${key}_${suffix}`
        while (usedKeys.has(candidate)) {
          suffix++
          candidate = `${key}_${suffix}`
        }
        freshKey = candidate
      }
      node['_key'] = freshKey
      usedKeys.add(freshKey)
      return
    }
    usedKeys.add(key)
  }

  const adopted = nodes.filter((node) => adoptedNodes.has(node))
  const rest = nodes.filter((node) => !adoptedNodes.has(node))
  for (const node of [...adopted, ...rest]) {
    claim(node)
  }

  for (const node of nodes) {
    enforceNestedSiblingKeyUniqueness(node, keyGenerator, adoptedNodes)
  }
}

function enforceNestedSiblingKeyUniqueness(
  node: Node,
  keyGenerator: () => string,
  adoptedNodes: AdoptedNodes,
): void {
  for (const value of Object.values(node)) {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'object' && item !== null) &&
      value.length > 0
    ) {
      enforceSiblingKeyUniqueness(
        value as Array<Node>,
        keyGenerator,
        adoptedNodes,
      )
    } else if (typeof value === 'object' && value !== null) {
      enforceNestedSiblingKeyUniqueness(
        value as Node,
        keyGenerator,
        adoptedNodes,
      )
    }
  }
}
