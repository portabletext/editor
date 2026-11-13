import {applyAll, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  makeDiff,
} from '@sanity/diff-match-patch'
import {
  arrayIndex,
  arraySegments,
  isRecord,
  resolvePath,
  walkNodes,
} from './lib/document'
import {getValue} from './lib/get-value'
import {isKeyedSegment} from './lib/is-keyed-segment'
import {pathContains} from './lib/path-contains'
import {pathEquals} from './lib/path-equals'
import {mapPoint, type Step, type StepPath} from './step-mapper'

/*
 * The recognition contract (internal design rationale, not consumer docs):
 *
 * Steps are derived by applying each patch to a working copy of the value
 * as it goes: a
 * `diffMatchPatch`'s offsets only mean anything against the span text they
 * were computed from, which shifts patch by patch within the same
 * transaction (a decorator applied mid-span, say, whose second
 * `diffMatchPatch` targets the span text left behind by the first). After
 * that replay, unresolved removals stay as removals: text pairing follows
 * patch order and only considers insertions observed after the removal.
 *
 * Pairing a removal with an insertion is a claim that one node moved (a
 * block split's tail, a decorator carving a span in three, a merge folding
 * one span into another), which lets a point that sat inside the moved
 * text follow it instead of collapsing to the removal boundary. A wrong
 * pairing is worse than a missed one (it teleports a point to unrelated
 * content instead of just degrading its precision), so pairing only fires
 * for two shapes designed to make a coincidental, unrelated match rare,
 * and backs off whenever more than one candidate would fit:
 *
 * - A brand-new node from an `insert` patch pairs with a removal whose
 *   text matches it exactly and is at least 2 characters (a single
 *   character is too common to trust), unless the inserted node reuses
 *   the removed text's span key: a block split re-inserts its tail under
 *   the same key, so a 1-character tail pairs too. A whole-node removal (`unset` of
 *   a keyed segment) can land in either patch order (a block merge's
 *   `insert` can arrive before or after the `unset` it pairs with). A text
 *   carve only pairs with an insertion observed after it. A removal
 *   and insertion that land on the same path pair
 *   with nothing: that's the same node reappearing at a new position in
 *   its array (a block reorder), not content moving between nodes, and
 *   `move.text` has nothing to add.
 * - Text folded into an existing span (an `insert.text` step from a
 *   `diffMatchPatch`) pairs only with a whole-node removal (`unset` of a
 *   keyed segment) whose text, read from the working copy at the moment
 *   of removal, matches the folded text exactly and is at least 2
 *   characters, in either patch order (a span merge folds before it
 *   unsets the absorbed span). The insert must also land at the
 *   destination span's current end (its offset equals that span's text
 *   length at fold time): appending is the only shape a real span merge
 *   produces, so an insert landing mid-span or at the start is local
 *   typing that happens to read the same as some unrelated removal, never
 *   a merge. A 1-character fold pairs only with a span removed from the
 *   destination's own block (a merge of a 1-character block).
 *
 * A removal whose text matches more than one still-available candidate,
 * or an insertion matched by more than one still-available removal, pairs
 * with neither. The two rules above are evaluated together for this: a
 * removal claimed by one candidate of each kind (an unrelated node
 * insertion and an unrelated fold that both happen to read the same text)
 * backs off exactly like two candidates of the same kind would, and
 * ambiguity resolves to leaving all sides as plain removal/insertion
 * steps.
 *
 * Final-state pairing deliberately departs from #3208's rule that constraints
 * can only remove candidates. It admits an insert-first candidate once replay
 * proves that candidate survives in the final value, but only when exactly one
 * surviving candidate fits the removal. This makes structural recognition
 * independent of patch order without letting a discarded scratch node or an
 * ambiguous copy claim the removed text (Josef's override).
 *
 * These rules don't rule coincidence out entirely: two whole-node edits
 * in the same batch that happen to carry identical text 2 characters or
 * longer (an unrelated block deleted here, a different block bearing the
 * same words inserted there) still read as one move. The design accepts
 * that residual on purpose.
 *
 * A known gap in the removal side: a whole-node removal's text is read
 * from the working copy at the moment its `unset` patch is processed, so
 * if that node's own span were edited again between an earlier fold that
 * consumes it and its own later `unset`, the removal's captured text and
 * range would reflect that intervening edit rather than what the fold
 * actually carried. The real engine never emits that shape (a merge's own
 * `unset` follows its fold with no further edit to the absorbed node in
 * between), so this stays a documented limit rather than a fix.
 *
 * A paired whole-node removal keeps its `remove.node` step (a block or
 * span can hold more than the single representative span the match was
 * made on, so anything the move doesn't cover still needs to be
 * invalidated), relocated to sit right after the `move.text` step so a
 * point reaches the move before it can be nulled. A paired text removal
 * needs no such step: the diff range it came from covers exactly the text
 * that moved, nothing more.
 *
 */

/**
 * Derive the steps a transaction's wire patches produce, by replaying the
 * patches against a working copy of `base` (a `diffMatchPatch` only
 * decodes against the text it was computed from). Moved text and moved
 * nodes are recognized conservatively so points can follow content;
 * anything ambiguous degrades to plain insert/remove steps, so a point
 * degrades to a boundary instead of relocating into unrelated content.
 *
 * The output is good enough to place a caret, never good enough to
 * reconstruct content: steps carry lengths, offsets, paths, and keys,
 * never text.
 *
 * @public
 */
export function interpretTransaction(
  base: ReadonlyArray<PortableTextBlock>,
  patches: ReadonlyArray<Patch>,
): Step[] {
  let workingCopy: unknown = createWorkingCopy(base, patches)
  const isSingleTextPatch =
    patches.length === 1 &&
    patches[0]?.path.at(-1) === 'text' &&
    (patches[0].type === 'diffMatchPatch' ||
      patches[0].type === 'set' ||
      patches[0].type === 'unset' ||
      patches[0].type === 'setIfMissing')
  const slots: Array<Step | null> = []
  const removalCandidates: Array<RemovalCandidate> = []
  const insertionCandidates: Array<InsertionCandidate> = []
  const nodeRemovals: Array<NodeRemoval> = []
  const nodeInsertions: Array<NodeInsertion> = []
  const splitTailCandidates: Array<{
    key: string
    blockPath: StepPath
    candidate: InsertionCandidate
  }> = []

  // A scratch node born and discarded within the same transaction (typing
  // composition's throwaway spans, say) can't be what a pre-existing point
  // addresses, so its key reappearing elsewhere is never a move worth
  // recognizing: only a removal of a key that predates the transaction
  // qualifies.
  const preExistingKeys = new Set<string>()
  const preExistingNodePaths = new Set<string>()
  if (!isSingleTextPatch) {
    for (const keyedNode of collectKeyedNodes(base, [])) {
      preExistingKeys.add(keyedNode.key)
      preExistingNodePaths.add(JSON.stringify(keyedNode.path))
    }
  }

  // A `set` on `_key` (a rename raised ahead of a merge to dodge a
  // collision, say) gives a transaction-local key the same lineage back to
  // a pre-existing node, but that lineage is only trusted for a
  // container-walk match (see the `unset` case below) on the exact path
  // the rename produced: the map records where the renamed node lives,
  // not just the key value it now wears, so an unrelated pre-existing
  // node that happens to bear the same key elsewhere is never mistaken
  // for it.
  const renamedKeyPaths = new Map<string, StepPath>()

  const pushStep = (step: Step): number => slots.push(step) - 1
  const pushSlot = (): number => slots.push(null) - 1
  const invalidationSlots = new Set<number>()
  const invalidationPaths: Array<StepPath> = []
  const pushInvalidation = (path: StepPath): void => {
    invalidationPaths.push(path)
    invalidationSlots.add(pushStep({type: 'remove.node', path}))
  }

  for (const wirePatch of patches) {
    const resolved = resolvePath(workingCopy, wirePatch.path)
    const patch = {...wirePatch, path: resolved.path}
    const nextValue = applyAll(workingCopy, [wirePatch])
    switch (patch.type) {
      case 'diffMatchPatch': {
        const lastSegment = patch.path[patch.path.length - 1]

        if (lastSegment !== 'text' || !resolved.reachable) {
          break
        }

        const spanPath = patch.path.slice(0, -1) as StepPath
        const spanNode = getValue(workingCopy, spanPath)
        const oldText = nodeText(spanNode)
        if (oldText === undefined) {
          break
        }

        const newText = getValue(nextValue, wirePatch.path)
        if (typeof newText !== 'string') {
          break
        }
        const diff = cleanupEfficiency(makeDiff(oldText, newText), 5)

        const destinationLengthAtFoldTime = oldText.length

        let offset = 0
        for (const [op, text] of diff) {
          if (op === DIFF_INSERT) {
            const slotIndex = pushStep({
              type: 'insert.text',
              path: spanPath,
              offset,
              length: text.length,
            })
            if (offset === destinationLengthAtFoldTime) {
              insertionCandidates.push({
                kind: 'fold',
                text,
                path: spanPath,
                offset,
                slotIndex,
                isBlockInsertion: false,
                consumed: false,
              })
            }
            offset += text.length
          } else if (op === DIFF_DELETE) {
            const slotIndex = pushStep({
              type: 'remove.text',
              path: spanPath,
              offset,
              length: text.length,
            })
            if (text.length > 0) {
              removalCandidates.push({
                text,
                from: {path: spanPath, offset, length: text.length},
                slotIndex,
                isNodeRemoval: false,
                isBlockRemoval: false,
                consumed: false,
              })
            }
          } else if (op === DIFF_EQUAL) {
            offset += text.length
          }
        }

        break
      }

      case 'set': {
        if (!resolved.reachable) {
          break
        }
        const propertyName = patch.path[patch.path.length - 1]
        const nodePath = patch.path.slice(0, -1) as StepPath

        if (propertyName === '_key') {
          if (typeof patch.value === 'string') {
            const containerPath = nodePath.slice(0, -1)
            const oldSiblings = getValue(workingCopy, containerPath)
            const newSiblings = getValue(nextValue, containerPath)
            if (Array.isArray(oldSiblings) && Array.isArray(newSiblings)) {
              const index = arrayIndex(oldSiblings, nodePath.at(-1))
              const segment = arraySegments(newSiblings)[index]
              if (segment !== undefined) {
                const newPath: StepPath = [...containerPath, segment]
                pushStep(
                  isKeyedSegment(segment)
                    ? {type: 'set.key', path: nodePath, newKey: patch.value}
                    : {type: 'move.node', from: nodePath, to: newPath},
                )
                renamedKeyPaths.set(patch.value, newPath)
              }
            }
          }
        } else if (propertyName === 'text') {
          pushStep({
            type: 'set.text',
            path: nodePath,
            length: typeof patch.value === 'string' ? patch.value.length : 0,
          })
        } else if (propertyName === 'children' && Array.isArray(patch.value)) {
          const oldChildren = getValue(workingCopy, patch.path)
          pushStep({
            type: 'set.children',
            path: nodePath,
            field: propertyName,
            oldChildren: asKeyedChildren(
              Array.isArray(oldChildren) ? oldChildren : [],
            ),
            newChildren: asKeyedChildren(patch.value),
          })
        } else if (
          walkNodes(resolved.value).some(
            ({node}) => nodeText(node) !== undefined,
          )
        ) {
          pushInvalidation(patch.path as StepPath)
        }

        break
      }

      case 'setIfMissing': {
        break
      }

      case 'unset': {
        if (!resolved.reachable || resolved.value === undefined) {
          break
        }
        const lastSegment = patch.path[patch.path.length - 1]

        if (isKeyedSegment(lastSegment) || typeof lastSegment === 'number') {
          const sourceNode = getValue(workingCopy, patch.path)
          const representative = removedTextSpan(
            sourceNode,
            patch.path as StepPath,
          )

          const slotIndex = pushStep({
            type: 'remove.node',
            path: patch.path as StepPath,
          })

          if (representative && representative.text.length > 0) {
            removalCandidates.push({
              text: representative.text,
              from: {
                path: representative.path,
                offset: 0,
                length: representative.text.length,
              },
              slotIndex,
              isNodeRemoval: true,
              isBlockRemoval: nodeChildren(sourceNode) !== undefined,
              consumed: false,
            })
          }

          const sourceKey = nodeKey(sourceNode)
          if (
            isKeyedSegment(lastSegment) &&
            sourceKey !== undefined &&
            preExistingKeys.has(sourceKey)
          ) {
            nodeRemovals.push({
              key: sourceKey,
              path: patch.path as StepPath,
              slotIndex,
              sourceNode,
            })
          }

          // A pre-existing descendant is independently trackable even though
          // the removal targets its container. Final-state filtering below
          // ensures only a unique surviving reappearance becomes a move.
          for (const keyedNode of collectKeyedNodes(
            sourceNode,
            patch.path as StepPath,
          )) {
            if (pathEquals(keyedNode.path, patch.path)) {
              continue
            }
            const renamedPath = renamedKeyPaths.get(keyedNode.key)
            if (
              preExistingNodePaths.has(JSON.stringify(keyedNode.path)) ||
              (renamedPath && pathEquals(renamedPath, keyedNode.path))
            ) {
              nodeRemovals.push({
                key: keyedNode.key,
                path: keyedNode.path,
                slotIndex,
                sourceNode: keyedNode.node,
              })
            }
          }
        } else if (lastSegment === 'text') {
          pushStep({
            type: 'set.text',
            path: patch.path.slice(0, -1) as StepPath,
            length: 0,
          })
        } else if (
          walkNodes(resolved.value).some(
            ({node}) => nodeText(node) !== undefined,
          )
        ) {
          pushInvalidation(patch.path as StepPath)
        }

        break
      }

      case 'insert': {
        const parentPath = patch.path.slice(0, -1) as StepPath
        const before = getValue(workingCopy, parentPath)
        const after = getValue(nextValue, parentPath)
        if (!Array.isArray(before) || !Array.isArray(after)) {
          break
        }
        const anchorIndex = arrayIndex(before, wirePatch.path.at(-1))
        const hasAnchor = anchorIndex >= 0 && anchorIndex < before.length
        const emptyAnchor =
          before.length === 0 &&
          (wirePatch.path.at(-1) === 0 || wirePatch.path.at(-1) === -1)
        if (!hasAnchor && !emptyAnchor) {
          break
        }
        if (patch.position === 'replace' && hasAnchor) {
          pushInvalidation(patch.path as StepPath)
        }
        const insertIndex =
          before.length === 0
            ? 0
            : anchorIndex + (patch.position === 'after' ? 1 : 0)
        const insertedCount =
          after.length -
          before.length +
          (patch.position === 'replace' && hasAnchor ? 1 : 0)
        const segments = arraySegments(after)
        for (
          let itemIndex = insertIndex;
          itemIndex < insertIndex + insertedCount;
          itemIndex++
        ) {
          const item = after[itemIndex]
          const itemPath: StepPath = [...parentPath, segments[itemIndex]!]

          const representative = representativeSpan(item, itemPath)
          if (representative && representative.text.length > 0) {
            insertionCandidates.push({
              kind: 'node',
              text: representative.text,
              path: representative.path,
              offset: 0,
              slotIndex: pushSlot(),
              isBlockInsertion: nodeChildren(item) !== undefined,
              consumed: false,
            })
          }

          // A block split inside a span with siblings re-inserts the split
          // span's tail under its own key next to the moved siblings. The
          // block's representative text is all of its children together,
          // which never equals the tail trimmed from the original span, so
          // the reused-key span is offered on its own. A single-child block
          // needs no extra candidate: its representative is that span.
          const blockChildren = nodeChildren(item)
          const textChildren =
            blockChildren?.filter((child) => nodeText(child) !== undefined) ??
            []
          if (textChildren.length > 1) {
            for (const child of textChildren) {
              const childKey = nodeKey(child)
              const childText = nodeText(child)!
              if (
                childKey === undefined ||
                childText.length === 0 ||
                !preExistingKeys.has(childKey)
              ) {
                continue
              }
              // Whether the key still lives outside the new block is only
              // known once every patch has applied (a trailing sibling is
              // trimmed and unset after the insert), so the slot is
              // reserved here and the candidate admitted after the loop.
              splitTailCandidates.push({
                key: childKey,
                blockPath: itemPath,
                candidate: {
                  kind: 'node',
                  text: childText,
                  path: [
                    ...itemPath,
                    'children',
                    arraySegments(blockChildren!)[
                      blockChildren!.indexOf(child)
                    ]!,
                  ],
                  offset: 0,
                  slotIndex: pushSlot(),
                  isBlockInsertion: false,
                  consumed: false,
                },
              })
            }
          }

          for (const keyedNode of collectKeyedNodes(item, itemPath)) {
            nodeInsertions.push({
              key: keyedNode.key,
              path: keyedNode.path,
              slotIndex: pushSlot(),
              node: keyedNode.node,
            })
          }
        }
        break
      }

      default:
        break
    }
    workingCopy = nextValue
  }

  for (const {key, blockPath, candidate} of splitTailCandidates) {
    if (keyLivesOutside(workingCopy, key, blockPath)) {
      insertionCandidates.push(candidate)
    }
  }

  // One text patch cannot pair a move or change a key.
  const steps = isSingleTextPatch
    ? slots.flatMap((step) => (step === null ? [] : [step]))
    : applyNetRekeys(
        base,
        workingCopy,
        assembleSteps(
          slots,
          removalCandidates,
          insertionCandidates,
          nodeRemovals,
          nodeInsertions,
          workingCopy,
          invalidationSlots,
        ),
        slots.flatMap((step) =>
          step?.type === 'remove.text' || step?.type === 'set.text'
            ? [step]
            : [],
        ),
        invalidationPaths,
      )

  return steps
}

function createWorkingCopy(
  base: ReadonlyArray<PortableTextBlock>,
  patches: ReadonlyArray<Patch>,
): Array<PortableTextBlock> {
  const workingCopy = [...base]
  const clonedBlockIndexes = new Set<number>()

  const rootIndexes = new Map<string, number>()
  base.forEach((block, index) => {
    const key = nodeKey(block)
    if (key !== undefined && !rootIndexes.has(key)) {
      rootIndexes.set(key, index)
    }
  })

  for (const patch of patches) {
    const blockSegment = patch.path[0]
    if (!isKeyedSegment(blockSegment)) {
      return structuredClone(base) as Array<PortableTextBlock>
    }

    const blockIndex = rootIndexes.get(blockSegment._key) ?? -1

    if (blockIndex < 0) {
      return structuredClone(base) as Array<PortableTextBlock>
    }

    if (!clonedBlockIndexes.has(blockIndex)) {
      workingCopy[blockIndex] = structuredClone(base[blockIndex]!)
      clonedBlockIndexes.add(blockIndex)
    }
  }

  return workingCopy
}

type RemovalCandidate = {
  text: string
  from: {path: StepPath; offset: number; length: number}
  slotIndex: number
  isNodeRemoval: boolean
  isBlockRemoval: boolean
  consumed: boolean
}

type InsertionCandidate = {
  kind: 'node' | 'fold'
  text: string
  path: StepPath
  offset: number
  slotIndex: number
  isBlockInsertion: boolean
  consumed: boolean
}

type Pairing = {removal: RemovalCandidate; insertion: InsertionCandidate}

type NodeRemoval = {
  key: string
  path: StepPath
  slotIndex: number
  sourceNode: unknown
}
type NodeInsertion = {
  key: string
  path: StepPath
  slotIndex: number
  node?: unknown
}
type NodeMove = {
  from: StepPath
  to: StepPath
  removalSlotIndex: number
  insertionSlotIndex: number
  sourceNode: unknown
  insertedNode: unknown
}

/**
 * Span keys are only unique within a block, so a removed span's key can
 * also live, untouched, in another block. Identity alone can't pair it
 * then: exactly one inserted node may carry the key, and it must be the
 * removed node unchanged as inserted (a merge carrying a span across, which
 * may then fold its text into a neighbour and unset it).
 */
function isUnchangedReappearance(
  removal: NodeRemoval,
  nodeInsertions: ReadonlyArray<NodeInsertion>,
): boolean {
  const withKey = nodeInsertions.filter(
    (insertion) => insertion.key === removal.key,
  )
  return (
    withKey.length === 1 &&
    structurallyEqual(removal.sourceNode, withKey[0]!.node)
  )
}

/**
 * Span keys are only unique within a block, so two removed blocks can both
 * hold a span with the reappearing key. The reappearance still has one
 * origin when exactly one of those removed spans is the inserted node,
 * unchanged.
 */
function isOnlyExactOrigin(
  removal: NodeRemoval,
  sameKeyRemovals: ReadonlyArray<NodeRemoval>,
  insertion: NodeInsertion,
): boolean {
  const exact = sameKeyRemovals.filter((candidate) =>
    structurallyEqual(candidate.sourceNode, insertion.node),
  )
  return exact.length === 1 && exact[0] === removal
}

/**
 * Resolve which removed node keys reappear, at any depth, inside a node
 * inserted elsewhere in the same transaction: exact identity carries no
 * coincidence risk the way text matching does, so unlike `pairMoves`,
 * order between the removal and the insertion doesn't matter. A key
 * appearing in more than one inserted node can't be resolved to a single
 * destination, so it's left unrecognized (the malformed-input guard), and
 * the same guard applies symmetrically to a key removed more than once
 * (two duplicate-keyed nodes both unset in the same transaction): with two
 * candidate origins for one reappearance, neither is the answer, so the
 * key pairs with nothing.
 */
function resolveNodeMoves(
  nodeRemovals: ReadonlyArray<NodeRemoval>,
  nodeInsertions: ReadonlyArray<NodeInsertion>,
): Array<NodeMove> {
  const insertionsByKey = new Map<string, Array<NodeInsertion>>()
  for (const insertion of nodeInsertions) {
    const occurrences = insertionsByKey.get(insertion.key) ?? []
    occurrences.push(insertion)
    insertionsByKey.set(insertion.key, occurrences)
  }

  const removalsByKey = new Map<string, Array<NodeRemoval>>()
  for (const removal of nodeRemovals) {
    const occurrences = removalsByKey.get(removal.key) ?? []
    occurrences.push(removal)
    removalsByKey.set(removal.key, occurrences)
  }

  const moves: Array<NodeMove> = []
  for (const removal of nodeRemovals) {
    const [insertion, ...extraInsertions] =
      insertionsByKey.get(removal.key) ?? []
    if (insertion === undefined || extraInsertions.length > 0) {
      continue
    }
    const sameKeyRemovals = removalsByKey.get(removal.key) ?? []
    if (
      sameKeyRemovals.length !== 1 &&
      !isOnlyExactOrigin(removal, sameKeyRemovals, insertion)
    ) {
      continue
    }
    moves.push({
      from: removal.path,
      to: insertion.path,
      removalSlotIndex: removal.slotIndex,
      insertionSlotIndex: insertion.slotIndex,
      sourceNode: removal.sourceNode,
      insertedNode: insertion.node,
    })
  }
  return moves
}

/**
 * Resolve which removal/insertion candidates pair into moves, then replay
 * `slots` in order, substituting each pairing's `move.text` step at its
 * insertion's slot and dropping the removal's own slot (a whole-node
 * removal's `remove.node` step is kept, relocated to right after the
 * move; see the module doc comment for why).
 *
 * Text-pairing runs first and wins whenever it applies: a removal it
 * already resolved into a `move.text` chain (a block merge's node hop
 * followed by a span fold, say) is handled precisely by that chain, and
 * racing an identity-based move against it would just strand the chain's
 * own removal candidate. Key-reappearance only picks up removals and
 * insertions text-pairing left untouched: an insertion it already claimed
 * is off the table for key-pairing too, the same as its paired removal.
 *
 * A recognized `nodeMove` can subsume text edits that reconstruct its
 * inserted node. Earlier descendant removals remain when the inserted
 * subtree does not contain the removed descendant.
 */
function assembleSteps(
  slots: ReadonlyArray<Step | null>,
  removalCandidates: ReadonlyArray<RemovalCandidate>,
  insertionCandidates: ReadonlyArray<InsertionCandidate>,
  nodeRemovals: ReadonlyArray<NodeRemoval>,
  nodeInsertions: ReadonlyArray<NodeInsertion>,
  finalValue: unknown,
  invalidationSlots: ReadonlySet<number>,
): Array<Step> {
  const finalKeyCounts = new Map<string, number>()
  for (const keyedNode of collectKeyedNodes(finalValue, [])) {
    finalKeyCounts.set(
      keyedNode.key,
      (finalKeyCounts.get(keyedNode.key) ?? 0) + 1,
    )
  }
  const pairings = pairMoves(removalCandidates, insertionCandidates)

  const pairingsByInsertionSlot = new Map<number, Pairing>()
  const nulledRemovalSlots = new Set<number>()
  for (const pairing of pairings) {
    pairingsByInsertionSlot.set(pairing.insertion.slotIndex, pairing)
    nulledRemovalSlots.add(pairing.removal.slotIndex)
  }

  const nodeMoves = resolveNodeMoves(
    nodeRemovals.filter(
      (removal) =>
        !nulledRemovalSlots.has(removal.slotIndex) &&
        ((finalKeyCounts.get(removal.key) ?? 0) <= 1 ||
          isUnchangedReappearance(removal, nodeInsertions)),
    ),
    nodeInsertions.filter(
      (insertion) =>
        !insertionCandidates.some(
          (candidate) =>
            candidate.consumed && pathEquals(candidate.path, insertion.path),
        ),
    ),
  )

  const nonNestedNodeMoves = nodeMoves.filter(
    (move) =>
      !nodeMoves.some(
        (containerMove) =>
          containerMove !== move &&
          containerMove.from.length < move.from.length &&
          pathContains(containerMove.from, move.from) &&
          containerMove.to.length < move.to.length &&
          pathContains(containerMove.to, move.to),
      ),
  )

  const supersededSlots = new Set<number>()
  const nodeMoveByInsertionSlot = new Map<number, NodeMove>()

  // A container's `remove.node` step can end up shared, as a removal
  // slot, by more than one recognized move: a block merge unsets the
  // whole donor block in one step, and every renamed child it carried
  // resolves its own move against that same slot. When the move IS the
  // container itself (its `from` is exactly the removed step's own path,
  // the block-move shape), the step is fully accounted for and dropped.
  // When the move is a strict descendant of it instead (the merge shape),
  // the container can still hold more than what moved, so its step
  // survives, relocated after the last such descendant move so a point
  // reaches every move before it can be nulled.
  const wholeNodeConsumedSlots = new Set<number>()
  const relocatedRemovalBySlot = new Map<
    number,
    {step: Step; afterInsertionSlot: number}
  >()

  for (const move of nonNestedNodeMoves) {
    supersededSlots.add(move.removalSlotIndex)
    nodeMoveByInsertionSlot.set(move.insertionSlotIndex, move)
    const carriesOldPathEdits = structurallyEqual(
      move.sourceNode,
      move.insertedNode,
    )
    for (let i = 0; i < slots.length; i++) {
      if (invalidationSlots.has(i)) {
        continue
      }
      const step = slots[i]
      const path = step ? stepPath(step) : undefined
      if (
        path &&
        i <= move.removalSlotIndex &&
        pathContains(move.from, path) &&
        !(
          carriesOldPathEdits &&
          i < move.removalSlotIndex &&
          isTextEdit(step)
        ) &&
        !(
          step?.type === 'remove.node' &&
          i < move.removalSlotIndex &&
          getValue(move.insertedNode, path.slice(move.from.length)) ===
            undefined
        )
      ) {
        supersededSlots.add(i)
      }
      if (
        i > move.insertionSlotIndex &&
        path &&
        pathContains(move.to, path) &&
        structurallyEqual(move.sourceNode, getValue(finalValue, move.to))
      ) {
        supersededSlots.add(i)
      }
    }

    const removalStep = slots[move.removalSlotIndex]
    if (removalStep?.type === 'remove.node') {
      if (pathEquals(removalStep.path, move.from)) {
        wholeNodeConsumedSlots.add(move.removalSlotIndex)
      } else {
        const existing = relocatedRemovalBySlot.get(move.removalSlotIndex)
        if (
          !existing ||
          move.insertionSlotIndex > existing.afterInsertionSlot
        ) {
          relocatedRemovalBySlot.set(move.removalSlotIndex, {
            step: removalStep,
            afterInsertionSlot: move.insertionSlotIndex,
          })
        }
      }
    }
  }
  for (const slotIndex of wholeNodeConsumedSlots) {
    relocatedRemovalBySlot.delete(slotIndex)
  }

  const steps: Array<Step> = []
  const outputMarkAtRemoval = new Map<number, number>()

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    if (supersededSlots.has(slotIndex)) {
      continue
    }

    if (nulledRemovalSlots.has(slotIndex)) {
      outputMarkAtRemoval.set(slotIndex, steps.length)
      continue
    }

    const nodeMove = nodeMoveByInsertionSlot.get(slotIndex)
    if (nodeMove) {
      steps.push({type: 'move.node', from: nodeMove.from, to: nodeMove.to})
      const relocatedRemoval = relocatedRemovalBySlot.get(
        nodeMove.removalSlotIndex,
      )
      if (relocatedRemoval?.afterInsertionSlot === slotIndex) {
        steps.push(relocatedRemoval.step)
      }
      continue
    }

    const pairing = pairingsByInsertionSlot.get(slotIndex)
    if (pairing) {
      const {removal, insertion} = pairing
      const isPlacedAfterRemoval = insertion.slotIndex > removal.slotIndex
      const from = isPlacedAfterRemoval
        ? mapRemovalForward(
            steps.slice(outputMarkAtRemoval.get(removal.slotIndex) ?? 0),
            removal.from,
          )
        : removal.from

      steps.push({
        type: 'move.text',
        from,
        to: {path: insertion.path, offset: insertion.offset},
      })

      if (removal.isNodeRemoval) {
        const removalStep = slots[removal.slotIndex]
        if (removalStep) {
          steps.push(removalStep)
        }
      }
      continue
    }

    const slot = slots[slotIndex]
    if (slot) {
      steps.push(slot)
    }
  }

  return steps
}

function isTextEdit(step: Step | null | undefined): boolean {
  return (
    step?.type === 'remove.text' ||
    step?.type === 'insert.text' ||
    step?.type === 'set.text'
  )
}

function pairMoves(
  removalCandidates: ReadonlyArray<RemovalCandidate>,
  insertionCandidates: ReadonlyArray<InsertionCandidate>,
): Array<Pairing> {
  const pairings: Array<Pairing> = []

  const removalsByText = new Map<string, Array<RemovalCandidate>>()
  const insertionsByText = new Map<string, Array<InsertionCandidate>>()
  for (const removal of removalCandidates) {
    const group = removalsByText.get(removal.text) ?? []
    group.push(removal)
    removalsByText.set(removal.text, group)
  }
  for (const insertion of insertionCandidates) {
    const group = insertionsByText.get(insertion.text) ?? []
    group.push(insertion)
    insertionsByText.set(insertion.text, group)
  }

  const tryPair = (insertion: InsertionCandidate): void => {
    if (insertion.consumed) {
      return
    }

    const eligibleRemovals = eligibleRemovalsFor(
      insertion,
      removalsByText.get(insertion.text) ?? [],
    )
    if (eligibleRemovals.length !== 1) {
      return
    }
    const removal = eligibleRemovals[0]!

    // The removal's own uniqueness check has to weigh both kinds
    // together: an insertion only counts as a rival claim on `removal` if
    // it is, in its own right, uniquely tied to `removal` too (its own
    // eligible-removals set is exactly this one). An insertion that has
    // some other removal available isn't a rival: it's slack that the
    // chain below resolves once that other removal is settled, which is
    // how a block merge's two chained moves (node move, then span fold)
    // still both pair despite sharing a removal in their initial,
    // unconsumed candidate pools.
    const hasRivalClaim = (insertionsByText.get(insertion.text) ?? []).some(
      (other) => {
        if (other === insertion || other.consumed) {
          return false
        }
        const othersEligibleRemovals = eligibleRemovalsFor(
          other,
          removalsByText.get(other.text) ?? [],
        )
        return (
          othersEligibleRemovals.length === 1 &&
          othersEligibleRemovals[0] === removal
        )
      },
    )
    if (hasRivalClaim) {
      return
    }

    removal.consumed = true
    insertion.consumed = true
    pairings.push({removal, insertion})
  }

  // Node insertions settle first, so a whole-node removal that's
  // genuinely a two-hop chain (moved to a new node, then folded from
  // there into a surviving span) claims its first hop before rule (b)
  // below even looks at the second.
  for (const insertion of insertionCandidates) {
    if (insertion.kind === 'node') {
      tryPair(insertion)
    }
  }

  for (const insertion of insertionCandidates) {
    if (insertion.kind === 'fold') {
      tryPair(insertion)
    }
  }

  return pairings
}

function eligibleRemovalsFor(
  insertion: InsertionCandidate,
  removalCandidates: ReadonlyArray<RemovalCandidate>,
): Array<RemovalCandidate> {
  return removalCandidates.filter(
    (removal) =>
      !removal.consumed &&
      removal.text === insertion.text &&
      (removal.text.length >= 2 ||
        isSameSpanSplit(removal, insertion) ||
        isSameBlockSpanFold(removal, insertion)) &&
      !pathEquals(removal.from.path, insertion.path) &&
      !(removal.isBlockRemoval && insertion.isBlockInsertion) &&
      (insertion.kind === 'node'
        ? removal.isNodeRemoval || removal.slotIndex < insertion.slotIndex
        : removal.isNodeRemoval),
  )
}

/**
 * A block split trims the tail off a span and re-inserts it in the new
 * block under the same span key. That key identity is the evidence the
 * two-character minimum otherwise stands in for, so a split whose tail is
 * a single character still pairs. A text removal paired with a node
 * insertion whose span reuses an unrelated key (Probe B) still needs two
 * characters.
 */
function isSameSpanSplit(
  removal: RemovalCandidate,
  insertion: InsertionCandidate,
): boolean {
  if (removal.isNodeRemoval || insertion.kind !== 'node') {
    return false
  }
  const removalKey = removal.from.path[removal.from.path.length - 1]
  const insertionKey = insertion.path[insertion.path.length - 1]
  return (
    isKeyedSegment(removalKey) &&
    isKeyedSegment(insertionKey) &&
    removalKey._key === insertionKey._key
  )
}

/**
 * A block merge moves the absorbed block's span into the surviving block,
 * folds its text onto the end of the span before it and then unsets the
 * moved span. Folding a span into its sibling in the same block is what a
 * merge is, so a single character pairs there too. A removal from another
 * block (Probe R2) still needs two characters.
 */
function isSameBlockSpanFold(
  removal: RemovalCandidate,
  insertion: InsertionCandidate,
): boolean {
  if (
    !removal.isNodeRemoval ||
    removal.isBlockRemoval ||
    insertion.kind !== 'fold'
  ) {
    return false
  }
  return (
    pathEquals(removal.from.path.slice(0, -2), insertion.path.slice(0, -2)) &&
    removal.from.path.at(-2) === 'children' &&
    insertion.path.at(-2) === 'children'
  )
}

/**
 * Re-read a captured `from` range against steps that landed between the
 * removal and the slot its move ended up at, so a point in the moved
 * range composes with edits made to the destination in between: when a
 * whole-node removal's move is placed after its own slot (the paired
 * insertion came later), other steps targeting the destination can sit
 * ahead of the move in the output, and the move's `from` range has to be
 * carried forward through those or it double-counts them (see the test
 * pinning destination coordinates against edits made between the move
 * and its slot for the failure this prevents).
 */
function mapRemovalForward(
  interveningSteps: ReadonlyArray<Step>,
  from: {path: StepPath; offset: number; length: number},
): {path: StepPath; offset: number; length: number} {
  const start = mapPoint(interveningSteps, {
    path: from.path,
    offset: from.offset,
  })
  const end = mapPoint(interveningSteps, {
    path: from.path,
    offset: from.offset + from.length,
  })

  if (start && end && pathEquals(start.path, end.path)) {
    return {
      path: start.path as StepPath,
      offset: start.offset,
      length: end.offset - start.offset,
    }
  }

  return from
}

function nodeText(node: unknown): string | undefined {
  if (!isRecord(node)) {
    return undefined
  }
  const text = node['text']
  return typeof text === 'string' ? text : undefined
}

function nodeKey(node: unknown): string | undefined {
  if (!isRecord(node)) {
    return undefined
  }
  const key = node['_key']
  return typeof key === 'string' ? key : undefined
}

function nodeChildren(node: unknown): Array<unknown> | undefined {
  if (!isRecord(node)) {
    return undefined
  }
  const children = node['children']
  return Array.isArray(children) ? children : undefined
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function asKeyedChildren(
  children: Array<unknown>,
): Array<{_key?: string; text?: string}> {
  return children.map((child) => {
    const key = nodeKey(child)
    const text = nodeText(child)
    return {
      ...(key === undefined ? {} : {_key: key}),
      ...(text === undefined ? {} : {text}),
    }
  })
}

function concatenatedSpanText(children: Array<unknown>): string {
  let text = ''
  for (const child of children) {
    const childText = nodeText(child)
    if (childText !== undefined) {
      text += childText
    }
  }
  return text
}

/**
 * Whether a node keyed `key` still exists somewhere other than under
 * `excludedPath`: the split span was truncated in place, so its key
 * lives on in the original block while the tail is re-inserted under it.
 * A sibling that was unset first doesn't, and keeps pairing as a node move.
 */
function keyLivesOutside(
  workingCopy: unknown,
  key: string,
  excludedPath: StepPath,
): boolean {
  return collectKeyedNodes(workingCopy, []).some(
    (node) => node.key === key && !pathContains(excludedPath, node.path),
  )
}

/**
 * The span a removed node's text is read from. Like `representativeSpan`,
 * except that when every character of a block sits in one span after its
 * other spans were emptied (a delete-across clearing the first span before
 * the merge), the removal is anchored on that span, where its text lives.
 */
function removedTextSpan(
  node: unknown,
  path: StepPath,
): {path: StepPath; text: string} | undefined {
  const representative = representativeSpan(node, path)
  const children = nodeChildren(node)
  if (representative === undefined || children === undefined) {
    return representative
  }
  const withText = children.filter(
    (child) => (nodeText(child) ?? '').length > 0,
  )
  return withText.length !== 1
    ? representative
    : {
        path: [
          ...path,
          'children',
          arraySegments(children)[children.indexOf(withText[0])]!,
        ],
        text: representative.text,
      }
}

function representativeSpan(
  node: unknown,
  path: StepPath,
): {path: StepPath; text: string} | undefined {
  const text = nodeText(node)
  if (text !== undefined) {
    return {path, text}
  }

  const children = nodeChildren(node)
  if (children === undefined) {
    return undefined
  }

  const firstSpanIndex = children.findIndex(
    (child) => nodeText(child) !== undefined,
  )
  if (firstSpanIndex < 0) {
    return undefined
  }

  return {
    path: [...path, 'children', arraySegments(children)[firstSpanIndex]!],
    text: concatenatedSpanText(children),
  }
}

/**
 * Extract the path a step's own mapping is anchored on, for the steps
 * that carry one. `move.text`, `move.node`, and `set.key` don't address a
 * single fixed path (that's the whole point of a move, and a rename's
 * own path already denotes the node under its old key rather than a
 * subtree other steps could fall inside), so they're outside
 * `assembleSteps`'s supersession sweep by construction.
 */
function stepPath(step: Step): StepPath | undefined {
  switch (step.type) {
    case 'insert.text':
    case 'remove.text':
    case 'set.text':
    case 'remove.node':
    case 'set.children':
      return step.path
    default:
      return undefined
  }
}

/**
 * Walk a freshly inserted node's own key and every keyed descendant's, at
 * any depth: a block split reusing a span's key several levels down
 * inside a new tail block is exactly the shape `resolveNodeMoves` needs
 * to see. Traversal includes arrays and object-valued fields without a schema.
 */
function collectKeyedNodes(
  node: unknown,
  path: StepPath,
): Array<{key: string; path: StepPath; node: unknown}> {
  return walkNodes(node, path).flatMap(({node: child, path: childPath}) => {
    const key = nodeKey(child)
    return key === undefined || key === '' || !isKeyedSegment(childPath.at(-1))
      ? []
      : [{key, path: childPath, node: child}]
  })
}

function nodeAnchoredPaths(step: Step): Array<StepPath> {
  switch (step.type) {
    case 'insert.text':
    case 'remove.text':
    case 'set.text':
    case 'remove.node':
    case 'set.children':
      return [step.path]
    case 'set.key':
      return [step.path]
    case 'move.text':
      return [step.from.path, step.to.path]
    case 'move.node':
      return [step.from, step.to]
  }
}

function applyNetRekeys(
  base: ReadonlyArray<PortableTextBlock>,
  finalValue: unknown,
  steps: ReadonlyArray<Step>,
  contentRemovalSteps: ReadonlyArray<Step>,
  invalidationPaths: ReadonlyArray<StepPath>,
): Array<Step> {
  const baseNodes = collectKeyedNodes(base, [])
  const finalNodes = collectKeyedNodes(finalValue, [])
  const baseKeys = new Set(baseNodes.map((node) => node.key))
  const finalKeys = new Set(finalNodes.map((node) => node.key))
  const replacements: Array<{
    oldRoot: StepPath
    newRoot: StepPath
    steps: Array<Step>
  }> = []

  for (const {node: oldNode, path: oldRoot, key: oldKey} of baseNodes) {
    if (
      finalKeys.has(oldKey) ||
      nodeText(oldNode) !== undefined ||
      invalidationPaths.some(
        (path) => pathContains(path, oldRoot) || pathContains(oldRoot, path),
      )
    ) {
      continue
    }
    const parentPath = oldRoot.slice(0, -1)
    const oldSiblings = getValue(base, parentPath)
    const newSiblings = getValue(finalValue, parentPath)
    if (!Array.isArray(oldSiblings) || !Array.isArray(newSiblings)) {
      continue
    }
    const index = arrayIndex(oldSiblings, oldRoot.at(-1))
    const newNode = newSiblings[index]
    const newKey = nodeKey(newNode)
    if (
      newKey === undefined ||
      oldKey === newKey ||
      finalKeys.has(oldKey) ||
      baseKeys.has(newKey) ||
      !structurallyEqualWithoutKeys(oldNode, newNode) ||
      newSiblings.filter((node) => structurallyEqualWithoutKeys(oldNode, node))
        .length !== 1
    ) {
      continue
    }
    const newRoot: StepPath = [
      ...parentPath,
      arraySegments(newSiblings)[index]!,
    ]
    if (
      invalidationPaths.some(
        (path) => pathContains(path, newRoot) || pathContains(newRoot, path),
      )
    ) {
      continue
    }
    const keySteps: Array<Step> = [
      {type: 'move.node', from: oldRoot, to: newRoot},
    ]
    if (isKeyedSegment(newRoot.at(-1))) {
      keySteps[0] = {type: 'set.key', path: oldRoot, newKey}
    }
    collectDescendantKeyChanges(oldNode, newNode, newRoot, keySteps)
    replacements.push({oldRoot, newRoot, steps: keySteps})
  }

  if (replacements.length === 0) {
    return [...steps]
  }

  return [
    ...replacements.flatMap((replacement) =>
      contentRemovalSteps.filter((step) =>
        nodeAnchoredPaths(step).some((path) =>
          pathContains(replacement.oldRoot, path),
        ),
      ),
    ),
    ...replacements.flatMap((replacement) => replacement.steps),
    ...steps.filter((step) =>
      replacements.every((replacement) =>
        nodeAnchoredPaths(step).every(
          (path) =>
            !pathContains(replacement.oldRoot, path) &&
            !pathContains(replacement.newRoot, path),
        ),
      ),
    ),
  ]
}

function collectDescendantKeyChanges(
  oldNode: unknown,
  newNode: unknown,
  parentPath: StepPath,
  steps: Array<Step>,
): void {
  if (Array.isArray(oldNode) && Array.isArray(newNode)) {
    const oldSegments = arraySegments(oldNode)
    const newSegments = arraySegments(newNode)
    for (
      let index = 0;
      index < Math.min(oldNode.length, newNode.length);
      index++
    ) {
      const oldSegment = oldSegments[index]!
      const newSegment = newSegments[index]!
      const oldPath: StepPath = [...parentPath, oldSegment]
      const newPath: StepPath = [...parentPath, newSegment]
      if (!pathEquals(oldPath, newPath)) {
        steps.push(
          isKeyedSegment(newSegment)
            ? {type: 'set.key', path: oldPath, newKey: newSegment._key}
            : {type: 'move.node', from: oldPath, to: newPath},
        )
      }
      collectDescendantKeyChanges(
        oldNode[index],
        newNode[index],
        newPath,
        steps,
      )
    }
  } else if (isRecord(oldNode) && isRecord(newNode)) {
    for (const [field, oldChild] of Object.entries(oldNode)) {
      collectDescendantKeyChanges(
        oldChild,
        newNode[field],
        [...parentPath, field],
        steps,
      )
    }
  }
}

function structurallyEqualWithoutKeys(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) =>
        structurallyEqualWithoutKeys(value, right[index]),
      )
    )
  }
  if (isRecord(left) && isRecord(right)) {
    const leftEntries = Object.entries(left).filter(([key]) => key !== '_key')
    const rightEntries = Object.entries(right).filter(([key]) => key !== '_key')
    return (
      leftEntries.length === rightEntries.length &&
      leftEntries.every(([key, value]) =>
        structurallyEqualWithoutKeys(value, right[key]),
      )
    )
  }
  return left === right
}
