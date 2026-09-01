import type {InsertPatch, Patch, Path, PathSegment} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {
  applyPatches as diffMatchPatchApplyPatches,
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  makeDiff,
  parsePatch,
} from '@sanity/diff-match-patch'
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
 * `diffMatchPatch` targets the span text left behind by the first).
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
 *   character is too common to trust). A whole-node removal (`unset` of
 *   a keyed segment) can land in either patch order (a block merge's
 *   `insert` can arrive before or after the `unset` it pairs with); a
 *   removal that only carved text out of a still-living span must
 *   precede the insertion, the shape a block split or a decorator carve
 *   produces. A removal and insertion that land on the same path pair
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
 *   a merge.
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
 * These rules don't rule coincidence out entirely: two whole-node edits
 * in the same batch that happen to carry identical text 2 characters or
 * longer (an unrelated block deleted here, a different block bearing the
 * same words inserted there) still read as one move. The design accepts
 * that residual on purpose: every constraint these rules add only removes
 * candidates, it never adds one, so tightening a rule can only turn a
 * wrong pairing into a missed one (a caret degrading to a boundary),
 * never the other way around.
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
 * Every emitted step is node-anchored (its path, or its `from`/`to`
 * path, ends at a `KeyedSegment`); see `assertStepPathsAreNodeAnchored`
 * for why that invariant gets an explicit dev-mode guard.
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
  const workingCopy = structuredClone(base) as Array<PortableTextBlock>
  const slots: Array<Step | null> = []
  const removalCandidates: Array<RemovalCandidate> = []
  const insertionCandidates: Array<InsertionCandidate> = []
  const nodeRemovals: Array<NodeRemoval> = []
  const nodeInsertions: Array<NodeInsertion> = []

  // A scratch node born and discarded within the same transaction (typing
  // composition's throwaway spans, say) can't be what a pre-existing point
  // addresses, so its key reappearing elsewhere is never a move worth
  // recognizing: only a removal of a key that predates the transaction
  // qualifies.
  const preExistingKeys = new Set(
    base.flatMap((block) =>
      collectKeyedNodes(block, []).map((keyedNode) => keyedNode.key),
    ),
  )

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

  for (const patch of patches) {
    switch (patch.type) {
      case 'diffMatchPatch': {
        const lastSegment = patch.path[patch.path.length - 1]

        if (lastSegment !== 'text') {
          // A diffMatchPatch on a non-text property (e.g. a markDef field):
          // resolve, patch, and write back, mirroring a plain `set` on an
          // arbitrary property, which needs no point-mapping step.
          const currentValue = getValue(workingCopy, patch.path)
          if (typeof currentValue === 'string') {
            const [newValue] = diffMatchPatchApplyPatches(
              parsePatch(patch.value),
              currentValue,
              {allowExceedingIndices: true},
            )
            writeAt(workingCopy, patch.path, newValue)
          }
          break
        }

        const spanPath = patch.path.slice(0, -1) as StepPath
        const spanNode = getValue(workingCopy, spanPath)
        const oldText = nodeText(spanNode)
        if (oldText === undefined) {
          break
        }

        const [newText] = diffMatchPatchApplyPatches(
          parsePatch(patch.value),
          oldText,
          {allowExceedingIndices: true},
        )
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
                consumed: false,
              })
            }
          } else if (op === DIFF_EQUAL) {
            offset += text.length
          }
        }

        writeAt(workingCopy, patch.path, newText)
        break
      }

      case 'set': {
        const propertyName = patch.path[patch.path.length - 1]
        const nodePath = patch.path.slice(0, -1) as StepPath

        if (propertyName === '_key') {
          const oldKey = getValue(workingCopy, patch.path)
          if (typeof oldKey === 'string' && typeof patch.value === 'string') {
            const containerPath = nodePath.slice(0, -1)
            pushStep({
              type: 'set.key',
              path: [...containerPath, {_key: oldKey}],
              newKey: patch.value,
            })
            renamedKeyPaths.set(patch.value, [
              ...containerPath,
              {_key: patch.value},
            ])
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
        }

        writeAt(workingCopy, patch.path, patch.value)
        break
      }

      case 'setIfMissing': {
        const exists =
          patch.path.length === 0
            ? workingCopy.length > 0
            : getValue(workingCopy, patch.path) !== undefined

        if (!exists) {
          writeAt(workingCopy, patch.path, patch.value)
        }
        break
      }

      case 'unset': {
        const lastSegment = patch.path[patch.path.length - 1]

        if (isKeyedSegment(lastSegment)) {
          const sourceNode = getValue(workingCopy, patch.path)
          const representative = representativeSpan(
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
              consumed: false,
            })
          }

          if (preExistingKeys.has(lastSegment._key)) {
            nodeRemovals.push({
              key: lastSegment._key,
              path: patch.path as StepPath,
              slotIndex,
            })
          }

          // A renamed descendant is independently trackable even though
          // the removal here targets its container, not the descendant
          // itself (a block merge unsets the whole donor block after
          // renaming every colliding child ahead of it, say): each one
          // reappearing elsewhere is its own move, worth recognizing on
          // top of whatever the container's own key does. An ordinary
          // (never-renamed) descendant stays untracked here: nothing
          // resolves its own move.
          for (const keyedNode of collectKeyedNodes(
            sourceNode,
            patch.path as StepPath,
          )) {
            if (keyedNode.key === lastSegment._key) {
              continue
            }
            const renamedPath = renamedKeyPaths.get(keyedNode.key)
            if (renamedPath && pathEquals(renamedPath, keyedNode.path)) {
              nodeRemovals.push({
                key: keyedNode.key,
                path: keyedNode.path,
                slotIndex,
              })
            }
          }
        } else if (lastSegment === 'text') {
          pushStep({
            type: 'set.text',
            path: patch.path.slice(0, -1) as StepPath,
            length: 0,
          })
        }

        removeAt(workingCopy, patch.path)
        break
      }

      case 'insert': {
        applyInsert(workingCopy, patch)

        const parentPath = patch.path.slice(0, -1) as StepPath
        for (const item of patch.items) {
          const itemKey = nodeKey(item)
          if (itemKey === undefined) {
            continue
          }
          const itemPath: StepPath = [...parentPath, {_key: itemKey}]

          const representative = representativeSpan(item, itemPath)
          if (representative && representative.text.length > 0) {
            insertionCandidates.push({
              kind: 'node',
              text: representative.text,
              path: representative.path,
              offset: 0,
              slotIndex: pushSlot(),
              consumed: false,
            })
          }

          for (const keyedNode of collectKeyedNodes(item, itemPath)) {
            nodeInsertions.push({
              key: keyedNode.key,
              path: keyedNode.path,
              slotIndex: pushSlot(),
            })
          }
        }
        break
      }

      default:
        break
    }
  }

  const steps = assembleSteps(
    slots,
    removalCandidates,
    insertionCandidates,
    nodeRemovals,
    nodeInsertions,
  )

  // @ts-expect-error - dot notation trips `noPropertyAccessFromIndexSignature`
  // (`ProcessEnv` is index-signature-only), but bracket notation would break
  // Vite's static replace of `process.env.NODE_ENV` at build time
  if (process.env.NODE_ENV !== 'production') {
    assertStepPathsAreNodeAnchored(steps)
  }

  return steps
}

type RemovalCandidate = {
  text: string
  from: {path: StepPath; offset: number; length: number}
  slotIndex: number
  isNodeRemoval: boolean
  consumed: boolean
}

type InsertionCandidate = {
  kind: 'node' | 'fold'
  text: string
  path: StepPath
  offset: number
  slotIndex: number
  consumed: boolean
}

type Pairing = {removal: RemovalCandidate; insertion: InsertionCandidate}

type NodeRemoval = {key: string; path: StepPath; slotIndex: number}
type NodeInsertion = {key: string; path: StepPath; slotIndex: number}
type NodeMove = {
  from: StepPath
  to: StepPath
  removalSlotIndex: number
  insertionSlotIndex: number
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
    if ((removalsByKey.get(removal.key) ?? []).length !== 1) {
      continue
    }
    moves.push({
      from: removal.path,
      to: insertion.path,
      removalSlotIndex: removal.slotIndex,
      insertionSlotIndex: insertion.slotIndex,
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
 * A recognized `nodeMove` supersedes not just its own `remove.node` slot
 * but every other step addressing that node's old path: the node didn't
 * die and get edited independently, it moved, so whatever edits landed on
 * its old path before the move was recognized (a diffMatchPatch emptying
 * it ahead of its own cleanup unset, say) never happened from the moved
 * point's perspective.
 */
function assembleSteps(
  slots: ReadonlyArray<Step | null>,
  removalCandidates: ReadonlyArray<RemovalCandidate>,
  insertionCandidates: ReadonlyArray<InsertionCandidate>,
  nodeRemovals: ReadonlyArray<NodeRemoval>,
  nodeInsertions: ReadonlyArray<NodeInsertion>,
): Array<Step> {
  const pairings = pairMoves(removalCandidates, insertionCandidates)

  const pairingsByInsertionSlot = new Map<number, Pairing>()
  const nulledRemovalSlots = new Set<number>()
  for (const pairing of pairings) {
    pairingsByInsertionSlot.set(pairing.insertion.slotIndex, pairing)
    nulledRemovalSlots.add(pairing.removal.slotIndex)
  }

  const nodeMoves = resolveNodeMoves(
    nodeRemovals.filter(
      (removal) => !nulledRemovalSlots.has(removal.slotIndex),
    ),
    nodeInsertions.filter(
      (insertion) =>
        !insertionCandidates.some(
          (candidate) =>
            candidate.consumed && pathEquals(candidate.path, insertion.path),
        ),
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

  for (const move of nodeMoves) {
    supersededSlots.add(move.removalSlotIndex)
    nodeMoveByInsertionSlot.set(move.insertionSlotIndex, move)
    for (let i = 0; i < slots.length; i++) {
      const step = slots[i]
      const path = step ? stepPath(step) : undefined
      if (path && pathContains(move.from, path)) {
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

function pairMoves(
  removalCandidates: ReadonlyArray<RemovalCandidate>,
  insertionCandidates: ReadonlyArray<InsertionCandidate>,
): Array<Pairing> {
  const pairings: Array<Pairing> = []

  const tryPair = (insertion: InsertionCandidate): void => {
    if (insertion.consumed) {
      return
    }

    const eligibleRemovals = eligibleRemovalsFor(insertion, removalCandidates)
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
    const hasRivalClaim = insertionCandidates.some((other) => {
      if (other === insertion || other.consumed) {
        return false
      }
      const othersEligibleRemovals = eligibleRemovalsFor(
        other,
        removalCandidates,
      )
      return (
        othersEligibleRemovals.length === 1 &&
        othersEligibleRemovals[0] === removal
      )
    })
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
      removal.text.length >= 2 &&
      !pathEquals(removal.from.path, insertion.path) &&
      (insertion.kind === 'node'
        ? removal.isNodeRemoval || removal.slotIndex < insertion.slotIndex
        : removal.isNodeRemoval),
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nodeText(node: unknown): string | undefined {
  if (!isPlainObject(node)) {
    return undefined
  }
  const text = node['text']
  return typeof text === 'string' ? text : undefined
}

function nodeKey(node: unknown): string | undefined {
  if (!isPlainObject(node)) {
    return undefined
  }
  const key = node['_key']
  return typeof key === 'string' ? key : undefined
}

function nodeChildren(node: unknown): Array<unknown> | undefined {
  if (!isPlainObject(node)) {
    return undefined
  }
  const children = node['children']
  return Array.isArray(children) ? children : undefined
}

function asKeyedChildren(
  children: Array<unknown>,
): Array<{_key: string; text?: string}> {
  return children.flatMap((child) => {
    const key = nodeKey(child)
    if (key === undefined) {
      return []
    }
    const text = nodeText(child)
    return [text === undefined ? {_key: key} : {_key: key, text}]
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
 * Resolve the span that represents a node for move recognition: the node
 * itself if it's a span, or its first span child plus the block's
 * concatenated span text if it's a text-bearing block. A block with no
 * span children (an inline/void child only) has nothing to represent.
 */
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

  const firstSpan = children.find((child) => nodeText(child) !== undefined)
  const firstSpanKey = nodeKey(firstSpan)
  if (firstSpanKey === undefined) {
    return undefined
  }

  return {
    path: [...path, 'children', {_key: firstSpanKey}],
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
 * to see. Traversal is structural (any array-valued property), not
 * schema-based, matching the rest of this module.
 */
function collectKeyedNodes(
  node: unknown,
  path: StepPath,
): Array<{key: string; path: StepPath}> {
  if (!isPlainObject(node)) {
    return []
  }

  const results: Array<{key: string; path: StepPath}> = []
  const key = nodeKey(node)
  if (key !== undefined) {
    results.push({key, path})
  }

  for (const [propertyName, value] of Object.entries(node)) {
    if (!Array.isArray(value)) {
      continue
    }
    for (const child of value) {
      const childKey = nodeKey(child)
      if (childKey !== undefined) {
        results.push(
          ...collectKeyedNodes(child, [
            ...path,
            propertyName,
            {_key: childKey},
          ]),
        )
      }
    }
  }

  return results
}

/**
 * `StepPath`'s type can't enforce node-anchoring: a producer could still
 * slice a path one segment short. A misanchored path then fails downstream
 * only silently, matching no point rather than raising where the mistake
 * was actually made, so this is the loud guard, run outside production.
 */
function assertStepPathsAreNodeAnchored(steps: ReadonlyArray<Step>): void {
  for (const step of steps) {
    for (const path of nodeAnchoredPaths(step)) {
      const lastSegment = path[path.length - 1]
      if (!isKeyedSegment(lastSegment)) {
        throw new Error(
          `${step.type} step's path is not node-anchored: ${JSON.stringify(path)}`,
        )
      }
    }
  }
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

function findParent(
  root: unknown,
  path: Path,
): {parent: unknown; key: PathSegment} | undefined {
  if (path.length === 0) {
    return undefined
  }
  return {
    parent: getValue(root, path.slice(0, -1)),
    key: path[path.length - 1]!,
  }
}

function writeAt(root: unknown, path: Path, value: unknown): void {
  const target = findParent(root, path)
  if (!target) {
    return
  }
  const {parent, key} = target

  if (typeof key === 'number' && Array.isArray(parent)) {
    parent[key] = value
  } else if (typeof key === 'string' && isPlainObject(parent)) {
    parent[key] = value
  } else if (isKeyedSegment(key) && Array.isArray(parent)) {
    const index = parent.findIndex((item) => nodeKey(item) === key._key)
    if (index !== -1) {
      parent[index] = value
    }
  }
}

function removeAt(root: unknown, path: Path): void {
  const target = findParent(root, path)
  if (!target) {
    return
  }
  const {parent, key} = target

  if (isKeyedSegment(key) && Array.isArray(parent)) {
    const index = parent.findIndex((item) => nodeKey(item) === key._key)
    if (index !== -1) {
      parent.splice(index, 1)
    }
  } else if (typeof key === 'string' && isPlainObject(parent)) {
    delete parent[key]
  }
}

function applyInsert(root: unknown, patch: InsertPatch): void {
  const anchorKey = patch.path[patch.path.length - 1]
  if (!isKeyedSegment(anchorKey)) {
    return
  }

  const parentArray = getValue(root, patch.path.slice(0, -1))
  if (!Array.isArray(parentArray)) {
    return
  }

  const index = parentArray.findIndex(
    (item) => nodeKey(item) === anchorKey._key,
  )
  if (index === -1) {
    return
  }

  const insertIndex = patch.position === 'after' ? index + 1 : index
  const clonedItems = patch.items.map((item) => structuredClone(item))
  parentArray.splice(insertIndex, 0, ...clonedItems)
}
