import {applyAll, type Patch} from '@portabletext/patches'
import type {PortableTextBlock, Schema} from '@portabletext/schema'
import {
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  makeDiff,
} from '@sanity/diff-match-patch'
import {type ArrayKeyCache} from './lib/array-index'
import {
  arrayIndex,
  arraySegment,
  arraySegments,
  isRecord,
  resolvePath,
  retainArrayKeys,
  walkNodes,
} from './lib/document'
import {getValue} from './lib/get-value'
import {isKeyedSegment} from './lib/is-keyed-segment'
import {pathContains} from './lib/path-contains'
import {pathEquals} from './lib/path-equals'
import {isTextSpan} from './lib/span'
import {mapPoint, type Point, type Step, type StepPath} from './step-mapper'

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
 * Final-state pairing can add a candidate as well as remove one:
 * it admits an insert-first candidate once replay
 * proves that candidate survives in the final value, but only when exactly one
 * surviving candidate fits the removal. This makes structural recognition
 * independent of patch order without letting a discarded scratch node or an
 * ambiguous copy claim the removed text.
 *
 * These rules don't rule coincidence out entirely: two whole-node edits
 * in the same batch that happen to carry identical text 2 characters or
 * longer (an unrelated block deleted here, a different block bearing the
 * same words inserted there) still read as one move. The design accepts
 * that residual on purpose.
 *
 * A key reappearing in an inserted node, at any depth, proposes a node
 * move only when the captured removal node and inserted node are
 * structurally equal in any base/removal versus insertion/final pair.
 * Containers must agree throughout, including numeric descendants.
 * Base evidence is available only through replayed node lineage.
 * `isValidMoveClaim` decides content equality for node and text routes.
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

type TextContext = {schema?: Schema; arrays: ArrayKeyCache}

/**
 * Derive the steps a transaction's wire patches produce, by replaying the
 * patches against a working copy of `base` (a `diffMatchPatch` only
 * decodes against the text it was computed from). Moved text and moved
 * nodes are recognized conservatively so points can follow content.
 * Ambiguous matches produce plain insert and remove steps.
 *
 * Steps carry paths, offsets, lengths, and keys. `set.children` also carries
 * the old and new children, including their text. Steps do not contain enough
 * information to reconstruct the document.
 *
 * @public
 */
export function interpretTransaction(
  base: ReadonlyArray<PortableTextBlock>,
  patches: ReadonlyArray<Patch>,
  options?: {schema?: Schema},
): Step[] {
  const context: TextContext = {schema: options?.schema, arrays: new WeakMap()}
  let workingCopy: unknown = base
  const isSingleTextPatch =
    patches.length === 1 &&
    patches[0]?.path.at(-1) === 'text' &&
    (patches[0].type === 'diffMatchPatch' ||
      patches[0].type === 'set' ||
      patches[0].type === 'unset' ||
      patches[0].type === 'setIfMissing')
  const hasNodeInsertions = patches.some((patch) => patch.type === 'insert')
  const canPairNodes =
    hasNodeInsertions && patches.some((patch) => patch.type === 'unset')
  const canPairText =
    hasNodeInsertions ||
    patches.some((patch) => patch.type === 'diffMatchPatch')
  const canRekey =
    hasNodeInsertions ||
    patches.some(
      (patch) => patch.type === 'set' && patch.path.at(-1) !== 'text',
    )
  const slots: Array<Step | null> = []
  const removalCandidates: Array<RemovalCandidate> = []
  const insertionCandidates: Array<InsertionCandidate> = []
  const nodeRemovals: Array<NodeRemoval> = []
  const nodeInsertions: Array<NodeInsertion> = []
  let origins: NodeOrigins | undefined
  const baseSnapshot = (numericPath: StepPath): unknown =>
    nodeOrigin(origins, numericPath)?.source
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
  let preExistingNodePaths: NodeOrigins | undefined
  if (canPairNodes) {
    const collected = collectOrigins(base, preExistingKeys)
    origins = collected.origins
    preExistingNodePaths = collected.preExistingNodePaths
  }

  const indexSnapshots = new Map<number, Array<ArrayIndexSnapshot>>()
  const memberships = new Map<number, ArrayMembership>()
  const pushStep = (step: Step): number => slots.push(step) - 1
  const pushSlot = (): number => slots.push(null) - 1
  const invalidationSlots = new Set<number>()
  const invalidationPaths: Array<StepPath> = []
  const pushInvalidation = (path: StepPath, index?: number): void => {
    invalidationPaths.push(path)
    invalidationSlots.add(
      pushStep({
        type: 'remove.node',
        path,
        ...(index === undefined ? {} : {index}),
      }),
    )
  }

  for (const wirePatch of patches) {
    const resolved = resolvePath(workingCopy, wirePatch.path, context.arrays)
    const patch = {...wirePatch, path: resolved.path}
    const nextValue = applyAll(workingCopy, [
      {...wirePatch, path: resolved.numericPath},
    ])
    retainArrayKeys(
      workingCopy,
      nextValue,
      resolved.numericPath,
      context.arrays,
    )
    const addressChanges = reconcileArrayAddresses(
      workingCopy,
      nextValue,
      patch,
      resolved.numericPath,
      context.arrays,
      canPairNodes,
    )
    if (canPairNodes && addressChanges.indices) {
      indexSnapshots.set(slots.length, [
        ...(indexSnapshots.get(slots.length) ?? []),
        {
          path: addressChanges.indices.path,
          ranges: addressChanges.indices.before,
        },
      ])
    }
    for (const step of addressChanges.before) {
      pushStep(step)
    }
    switch (patch.type) {
      case 'diffMatchPatch': {
        const lastSegment = patch.path[patch.path.length - 1]

        if (lastSegment !== 'text' || !resolved.reachable) {
          break
        }

        const spanPath = patch.path.slice(0, -1) as StepPath
        const spanNode = getValue(workingCopy, spanPath, context?.arrays)
        const oldText = nodeText(spanNode, workingCopy, spanPath, context)
        if (oldText === undefined) {
          break
        }

        const newText = getValue(nextValue, wirePatch.path, context?.arrays)
        if (typeof newText !== 'string') {
          break
        }
        const diff = cleanupEfficiency(makeDiff(oldText, newText), 5)

        const destinationLengthAtFoldTime = oldText.length

        let sourceLength = oldText.length
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
            sourceLength += text.length
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
                sourceLength,
                from: {path: spanPath, offset, length: text.length},
                slotIndex,
                isNodeRemoval: false,
                isBlockRemoval: false,
                consumed: false,
              })
            }
            sourceLength -= text.length
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
          const numericNodePath = (resolved.numericPath as StepPath).slice(
            0,
            -1,
          )
          // A rename keeps the node's numeric address, so its new key counts as
          // pre-existing only if the node itself predates the transaction.
          if (
            typeof patch.value === 'string' &&
            nodeOrigin(preExistingNodePaths, numericNodePath)?.preExisting
          ) {
            preExistingKeys.add(patch.value)
          }
        } else if (
          propertyName === 'text' &&
          nodeText(
            getValue(workingCopy, nodePath, context?.arrays),
            workingCopy,
            nodePath,
            context,
          ) !== undefined
        ) {
          pushStep({
            type: 'set.text',
            path: nodePath,
            length: typeof patch.value === 'string' ? patch.value.length : 0,
          })
        } else if (propertyName === 'children' && Array.isArray(patch.value)) {
          const oldChildren = getValue(workingCopy, patch.path, context?.arrays)
          pushStep({
            type: 'set.children',
            path: nodePath,
            field: propertyName,
            oldChildren: asKeyedChildren(
              Array.isArray(oldChildren) ? oldChildren : [],
              workingCopy,
              patch.path as StepPath,
              context,
            ),
            newChildren: asKeyedChildren(
              patch.value,
              nextValue,
              patch.path as StepPath,
              context,
            ),
          })
        } else if (
          walkNodes(resolved.value, patch.path as StepPath).some(
            ({node, path}) =>
              nodeText(node, workingCopy, path, context) !== undefined,
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
          const sourceNode = resolved.value
          const representative = canPairText
            ? removedTextSpan(
                sourceNode,
                patch.path as StepPath,
                workingCopy,
                context,
              )
            : undefined

          const siblings = getValue(
            workingCopy,
            patch.path.slice(0, -1),
            context?.arrays,
          )
          const index = Array.isArray(siblings)
            ? arrayIndex(siblings, lastSegment, context?.arrays)
            : -1
          const shiftsIndices =
            isKeyedSegment(lastSegment) &&
            Array.isArray(siblings) &&
            arraySegments(siblings, context.arrays)
              .slice(index + 1)
              .some((segment) => typeof segment === 'number')
          const slotIndex = pushStep({
            type: 'remove.node',
            path: patch.path as StepPath,
            ...(shiftsIndices ? {index} : {}),
          })
          if (index >= 0) {
            memberships.set(slotIndex, {
              path: patch.path as StepPath,
              index,
              shift:
                shiftsIndices ||
                (Array.isArray(siblings) &&
                  arraySegments(siblings, context.arrays)
                    .slice(index + 1)
                    .some((segment) => typeof segment === 'number')),
            })
          }

          if (representative && representative.text.length > 0) {
            removalCandidates.push({
              text: representative.text,
              sourceLength: representative.text.length,
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
              baseNode: baseSnapshot(resolved.numericPath as StepPath),
            })
          }

          // A pre-existing descendant is independently trackable even though
          // the removal targets its container. Final-state filtering below
          // ensures only a unique surviving reappearance becomes a move.
          if (canPairNodes) {
            for (const keyedNode of collectKeyedNodes(
              sourceNode,
              patch.path as StepPath,
            )) {
              if (pathEquals(keyedNode.path, patch.path)) {
                continue
              }
              const numericPath = resolvePath(
                workingCopy,
                keyedNode.path,
                context.arrays,
              ).numericPath
              if (
                nodeOrigin(preExistingNodePaths, numericPath as StepPath)
                  ?.preExisting
              ) {
                nodeRemovals.push({
                  key: keyedNode.key,
                  path: keyedNode.path,
                  slotIndex,
                  sourceNode: keyedNode.node,
                  baseNode: baseSnapshot(
                    resolvePath(workingCopy, keyedNode.path)
                      .numericPath as StepPath,
                  ),
                })
              }
            }
          }
        } else if (
          lastSegment === 'text' &&
          nodeText(
            getValue(workingCopy, patch.path.slice(0, -1), context?.arrays),
            workingCopy,
            patch.path.slice(0, -1) as StepPath,
            context,
          ) !== undefined
        ) {
          pushStep({
            type: 'set.text',
            path: patch.path.slice(0, -1) as StepPath,
            length: 0,
          })
        } else if (
          walkNodes(resolved.value, patch.path as StepPath).some(
            ({node, path}) =>
              nodeText(node, workingCopy, path, context) !== undefined,
          )
        ) {
          pushInvalidation(patch.path as StepPath)
        }

        break
      }

      case 'insert': {
        const parentPath = patch.path.slice(0, -1) as StepPath
        const before = getValue(workingCopy, parentPath, context?.arrays)
        const after = getValue(nextValue, parentPath, context?.arrays)
        if (!Array.isArray(before) || !Array.isArray(after)) {
          break
        }
        const anchorIndex = arrayIndex(
          before,
          wirePatch.path.at(-1),
          context?.arrays,
        )
        const hasAnchor = anchorIndex >= 0 && anchorIndex < before.length
        const emptyAnchor =
          before.length === 0 &&
          (wirePatch.path.at(-1) === 0 || wirePatch.path.at(-1) === -1)
        if (!hasAnchor && !emptyAnchor) {
          break
        }
        if (patch.position === 'replace' && hasAnchor) {
          pushInvalidation(
            patch.path as StepPath,
            isKeyedSegment(patch.path.at(-1)) &&
              (addressChanges.before.length > 0 ||
                arraySegments(before, context.arrays)
                  .slice(anchorIndex + 1)
                  .some((segment) => typeof segment === 'number'))
              ? anchorIndex
              : undefined,
          )
        }
        const insertIndex =
          before.length === 0
            ? 0
            : anchorIndex + (patch.position === 'after' ? 1 : 0)
        const insertedCount =
          after.length -
          before.length +
          (patch.position === 'replace' && hasAnchor ? 1 : 0)
        const oldSegments = arraySegments(before, context.arrays)
        const segments = arraySegments(after, context.arrays)
        let needsIndexShift = oldSegments.some(
          (segment) => typeof segment === 'number',
        )
        needsIndexShift ||= segments.some(
          (segment) => typeof segment === 'number',
        )
        const membershipSlot =
          needsIndexShift && insertedCount > 0
            ? pushStep({
                type: 'insert.node',
                path: [...parentPath, insertIndex],
                count: insertedCount,
              })
            : pushSlot()
        memberships.set(membershipSlot, {
          path: parentPath,
          index: insertIndex,
          count: insertedCount,
          insertedPaths: segments
            .slice(insertIndex, insertIndex + insertedCount)
            .map((segment) => [...parentPath, segment]),
          shift: needsIndexShift,
          destinationShift:
            oldSegments
              .slice(insertIndex)
              .some((segment) => typeof segment === 'number') ||
            addressChanges.before.length > 0,
        })
        for (
          let itemIndex = insertIndex;
          itemIndex < insertIndex + insertedCount;
          itemIndex++
        ) {
          const item = after[itemIndex]
          const itemPath: StepPath = [...parentPath, segments[itemIndex]!]

          const representative = representativeSpan(
            item,
            itemPath,
            nextValue,
            context,
          )
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
          const blockChildSegments = arraySegments(blockChildren ?? [])
          const textChildren =
            blockChildren?.flatMap((child, index) => {
              const text = nodeText(
                child,
                nextValue,
                [...itemPath, 'children', blockChildSegments[index]!],
                context,
              )
              return text === undefined ? [] : [{child, index, text}]
            }) ?? []
          if (textChildren.length > 1) {
            for (const {child, index, text: childText} of textChildren) {
              const childKey = nodeKey(child)
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
                  path: [...itemPath, 'children', blockChildSegments[index]!],
                  offset: 0,
                  slotIndex: pushSlot(),
                  isBlockInsertion: false,
                  consumed: false,
                },
              })
            }
          }

          for (const keyedNode of canPairNodes
            ? collectKeyedNodes(item, itemPath)
            : []) {
            nodeInsertions.push({
              key: keyedNode.key,
              path: keyedNode.path,
              slotIndex: pushSlot(),
              node: keyedNode.node,
              finalPath: resolvePath(nextValue, keyedNode.path)
                .numericPath as StepPath,
            })
          }
        }
        break
      }

      default:
        break
    }
    for (const step of addressChanges.after) {
      pushStep(step)
    }
    if (canPairNodes && addressChanges.indices) {
      indexSnapshots.set(slots.length, [
        ...(indexSnapshots.get(slots.length) ?? []),
        {
          path: addressChanges.indices.path,
          ranges: addressChanges.indices.after,
        },
      ])
    }
    if (canPairNodes) {
      preExistingNodePaths = replayPreExistingNodePaths(
        preExistingNodePaths,
        wirePatch,
        resolved.numericPath as StepPath,
        workingCopy,
        nextValue,
      )
      origins = replayOrigins(
        origins,
        resolved.numericPath as StepPath,
        wirePatch,
      )
      for (const insertion of nodeInsertions) {
        if (insertion.bornAt === undefined) {
          insertion.bornAt = wirePatch
        } else if (insertion.finalPath) {
          insertion.finalPath = replayNodePath(
            insertion.finalPath,
            wirePatch,
            resolved.numericPath as StepPath,
            workingCopy,
            nextValue,
          )
        }
      }
    }
    workingCopy = nextValue
  }

  for (const {key, blockPath, candidate} of splitTailCandidates) {
    if (keyLivesOutside(workingCopy, key, blockPath)) {
      insertionCandidates.push(candidate)
    }
  }

  for (const insertion of nodeInsertions) {
    insertion.finalNode = insertion.finalPath
      ? getValue(workingCopy, insertion.finalPath)
      : undefined
  }

  // One text patch cannot pair a move or change a key.
  const assembled =
    (removalCandidates.length > 0 && insertionCandidates.length > 0) ||
    (nodeRemovals.length > 0 && nodeInsertions.length > 0)
      ? assembleSteps(
          slots,
          removalCandidates,
          insertionCandidates,
          nodeRemovals,
          nodeInsertions,
          workingCopy,
          invalidationSlots,
          memberships,
          indexSnapshots,
        )
      : slots.flatMap((step) => (step === null ? [] : [step]))
  const steps =
    canRekey && !isSingleTextPatch
      ? applyNetRekeys(
          base,
          workingCopy,
          assembled,
          slots.flatMap((step) =>
            step?.type === 'remove.text' || step?.type === 'set.text'
              ? [step]
              : [],
          ),
          invalidationPaths,
          context,
        )
      : assembled

  return steps
}

type RemovalCandidate = {
  text: string
  sourceLength: number
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
  baseNode?: unknown
}
type NodeInsertion = {
  key: string
  path: StepPath
  slotIndex: number
  node?: unknown
  finalNode?: unknown
  finalPath?: StepPath
  bornAt?: Patch
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
    isValidMoveClaim(
      removal.sourceNode,
      withKey[0]!.node,
      removal.baseNode,
      withKey[0]!.finalNode,
    )
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
    isValidMoveClaim(
      candidate.sourceNode,
      insertion.node,
      candidate.baseNode,
      insertion.finalNode,
    ),
  )
  return exact.length === 1 && exact[0] === removal
}

/**
 * Resolve which removed node keys reappear, at any depth, inside a node
 * inserted elsewhere in the same transaction. A key is only a candidate:
 * captured source and inserted content must be structurally equal. Unlike `pairMoves`,
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
    if (
      insertion === undefined ||
      extraInsertions.length > 0 ||
      !isValidMoveClaim(
        removal.sourceNode,
        insertion.node,
        removal.baseNode,
        insertion.finalNode,
      )
    ) {
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
 * move. See the module doc comment for why).
 *
 * Validated whole-node moves take precedence. For other transfers, text
 * pairing wins whenever it applies: a removal it
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
  memberships: Map<number, ArrayMembership>,
  indexSnapshots: Map<number, Array<ArrayIndexSnapshot>>,
): Step[] {
  const rejectedMoves = resolveNodeMoves(nodeRemovals, nodeInsertions).filter(
    (move) =>
      move.from.length < move.to.length && pathContains(move.from, move.to),
  )
  while (true) {
    const result = tryAssembleSteps(
      slots,
      removalCandidates,
      insertionCandidates,
      nodeRemovals,
      nodeInsertions,
      finalValue,
      invalidationSlots,
      memberships,
      indexSnapshots,
      rejectedMoves,
    )
    if (Array.isArray(result)) {
      return result
    }
    rejectedMoves.push(...result.rejectedMoves)
  }
}

function tryAssembleSteps(
  slots: ReadonlyArray<Step | null>,
  removalCandidates: ReadonlyArray<RemovalCandidate>,
  insertionCandidates: ReadonlyArray<InsertionCandidate>,
  nodeRemovals: ReadonlyArray<NodeRemoval>,
  nodeInsertions: ReadonlyArray<NodeInsertion>,
  finalValue: unknown,
  invalidationSlots: ReadonlySet<number>,
  memberships: Map<number, ArrayMembership>,
  indexSnapshots: Map<number, Array<ArrayIndexSnapshot>>,
  rejectedMoves: ReadonlyArray<NodeMove>,
): Array<Step> | {rejectedMoves: NodeMove[]} {
  const declinedMoves: NodeMove[] = []
  const accepts = (move: NodeMove) =>
    !rejectedMoves.some(
      (rejected) =>
        rejected.removalSlotIndex === move.removalSlotIndex &&
        rejected.insertionSlotIndex === move.insertionSlotIndex,
    )
  const finalKeyCounts = new Map<string, number>()
  for (const keyedNode of collectKeyedNodes(finalValue, [])) {
    finalKeyCounts.set(
      keyedNode.key,
      (finalKeyCounts.get(keyedNode.key) ?? 0) + 1,
    )
  }
  // A validated whole-node claim uses one move.node, including its sibling
  // effects. Representative text pairing is reserved for partial transfers.
  const wholeClaims = resolveNodeMoves(nodeRemovals, nodeInsertions).filter(
    (move) => {
      const step = slots[move.removalSlotIndex]
      return (
        accepts(move) &&
        step?.type === 'remove.node' &&
        pathEquals(step.path, move.from) &&
        ((finalKeyCounts.get(nodeKey(move.sourceNode) ?? '') ?? 0) <= 1 ||
          nodeRemovals.some(
            (removal) =>
              removal.slotIndex === move.removalSlotIndex &&
              isUnchangedReappearance(removal, nodeInsertions),
          ))
      )
    },
  )
  const rejectedInsertions = new Set<number>()
  for (const move of rejectedMoves) {
    let membershipSlot = -1
    for (const [slot, fact] of memberships) {
      if (
        fact.count !== undefined &&
        slot < move.insertionSlotIndex &&
        pathEquals(fact.path, move.to.slice(0, -1))
      ) {
        membershipSlot = Math.max(membershipSlot, slot)
      }
    }
    for (const candidate of insertionCandidates) {
      if (
        candidate.slotIndex > membershipSlot &&
        candidate.slotIndex < move.insertionSlotIndex &&
        pathContains(move.to, candidate.path)
      ) {
        rejectedInsertions.add(candidate.slotIndex)
      }
    }
  }
  const pairings = pairMoves(
    removalCandidates
      .map((candidate) => ({...candidate}))
      .filter(
        (removal) =>
          !wholeClaims.some(
            (move) => move.removalSlotIndex === removal.slotIndex,
          ),
      ),
    insertionCandidates
      .filter((candidate) => !rejectedInsertions.has(candidate.slotIndex))
      .map((candidate) => ({...candidate})),
  )

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
        !pairings.some((pairing) =>
          pathEquals(pairing.insertion.path, insertion.path),
        ),
    ),
  )

  const acceptedNodeMoves = nodeMoves.filter(accepts)
  const nonNestedNodeMoves = acceptedNodeMoves.filter(
    (move) =>
      !acceptedNodeMoves.some(
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
    const carriesOldPathEdits = isValidMoveClaim(
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
        !(carriesOldPathEdits && i < move.removalSlotIndex) &&
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
  const sourceEndAtRemoval = new Map<number, {path: StepPath; offset: number}>()
  type Pending = {
    slot: number
    path: StepPath
    index?: number
    shift: boolean
    delta?: number
    move?: NodeMove
  }
  const pending: Pending[] = []
  // A deferred removal leaves its source at an ordinary document address.
  // Lift replay indices over those retained sources until the move consumes them.
  const lift = (path: StepPath): StepPath => {
    const result = [...path]
    for (let depth = 0; depth < result.length; depth++) {
      if (typeof result[depth] !== 'number') {
        continue
      }
      const ghosts = pending
        .filter(
          (p) =>
            p.index !== undefined &&
            p.path.length === depth + 1 &&
            pathEquals(p.path.slice(0, -1), result.slice(0, depth)),
        )
        .sort((a, b) => a.index! - b.index!)
      for (const ghost of ghosts) {
        if (ghost.index! <= (result[depth] as number)) {
          result[depth] = (result[depth] as number) + (ghost.delta ?? 1)
        }
      }
    }
    return result
  }
  const emit = (step: Step, except?: Pending): void => {
    steps.push(step)
    for (const source of pending) {
      if (source === except) {
        continue
      }
      // Only address effects apply to retained sources, never invalidation.
      if (step.type === 'remove.node' || step.type === 'insert.node') {
        const at =
          step.type === 'insert.node'
            ? step.path.at(-1)
            : (step.index ?? step.path.at(-1))
        if (typeof at !== 'number') {
          continue
        }
        const parent = step.path.slice(0, -1)
        const depth = parent.length
        if (pathEquals(parent, source.path.slice(0, depth))) {
          const index =
            source.path.length === depth + 1 ? source.index : source.path[depth]
          if (typeof index === 'number' && index >= at) {
            const next = index + (step.type === 'insert.node' ? step.count : -1)
            if (source.path.length === depth + 1) {
              source.index = next
            }
            if (typeof source.path[depth] === 'number') {
              source.path = [
                ...source.path.slice(0, depth),
                next,
                ...source.path.slice(depth + 1),
              ]
            }
          }
        }
      } else {
        source.path = (mapPoint([step], {path: source.path, offset: 0})?.path ??
          source.path) as StepPath
      }
    }
  }
  const translate = (step: Step): Step => {
    if (step.type === 'move.node') {
      return {...step, from: lift(step.from), to: lift(step.to)}
    }
    if (step.type === 'move.text') {
      return {
        ...step,
        from: {...step.from, path: lift(step.from.path)},
        to: {...step.to, path: lift(step.to.path)},
      }
    }
    const path = lift(step.path)
    if (step.type === 'remove.node' && step.index !== undefined) {
      return {
        ...step,
        path,
        index: lift([...step.path.slice(0, -1), step.index]).at(-1) as number,
      }
    }
    return {...step, path}
  }
  const defer = (slot: number, step: Step): void => {
    if (step.type !== 'remove.node') {
      return
    }
    const fact = memberships.get(slot)
    const path = lift(step.path)
    const index = fact
      ? (lift([...step.path.slice(0, -1), fact.index]).at(-1) as number)
      : undefined
    pending.push({slot, path, index, shift: fact?.shift ?? false})
  }
  const finishRemoval = (slot: number): void => {
    const source = pending.find((p) => p.slot === slot)
    if (!source) {
      return
    }
    pending.splice(pending.indexOf(source), 1)
    emit({
      type: 'remove.node',
      path: source.path,
      ...(source.shift &&
      typeof source.path.at(-1) !== 'number' &&
      source.index !== undefined
        ? {index: source.index}
        : {}),
    })
  }
  // Whole-node moves own the membership insertion, rather than emitting an
  // insert followed by a move. Other inserted members retain their event.
  const moveAtMembership = new Map<number, NodeMove[]>()
  const wholeMoves = new Set<NodeMove>()
  for (const move of nonNestedNodeMoves) {
    if (!wholeNodeConsumedSlots.has(move.removalSlotIndex)) {
      continue
    }
    let event: number | undefined
    for (const [slot, fact] of memberships) {
      if (
        fact.count !== undefined &&
        slot < move.insertionSlotIndex &&
        pathEquals(fact.path, move.to.slice(0, -1)) &&
        (event === undefined || slot > event)
      ) {
        event = slot
      }
    }
    if (event !== undefined) {
      wholeMoves.add(move)
      moveAtMembership.set(event, [
        ...(moveAtMembership.get(event) ?? []),
        move,
      ])
    }
  }
  let indexStates: Array<{path: StepPath; points: StepPath[]}> = []
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const previous = slots[slotIndex - 1]
    if (previous) {
      indexStates = indexStates.flatMap((state) => {
        const parent = mapPoint([previous], {path: state.path, offset: 0})
        if (parent === null) {
          return []
        }
        const points = state.points.flatMap((path) => {
          const mapped = mapPoint([previous], {path, offset: 0})
          return mapped && typeof mapped.path.at(-1) === 'number'
            ? [mapped.path as StepPath]
            : []
        })
        if (
          previous.type === 'move.node' &&
          isKeyedSegment(previous.from.at(-1)) &&
          typeof previous.to.at(-1) === 'number' &&
          pathEquals(previous.to.slice(0, -1), parent.path)
        ) {
          points.push(previous.to)
        }
        return [{path: parent.path as StepPath, points}]
      })
    }
    for (const snapshot of indexSnapshots.get(slotIndex) ?? []) {
      indexStates = indexStates.filter(
        (state) => !pathEquals(state.path, snapshot.path),
      )
      const points: StepPath[] = []
      for (const [start, end] of snapshot.ranges) {
        for (let index = start; index <= end; index++) {
          points.push([...snapshot.path, index])
        }
      }
      indexStates.push({path: snapshot.path, points})
    }
    const original = slots[slotIndex]
    const missing = pending.find((p) => p.slot === slotIndex && p.delta === -1)
    if (missing) {
      if (missing.move) {
        const move = missing.move
        const fact = memberships.get(slotIndex)!
        const from = lift(move.from)
        const fromIndex = lift([...fact.path.slice(0, -1), fact.index]).at(
          -1,
        ) as number
        const destination = mapPoint(
          [{type: 'remove.node', path: from, index: fromIndex}],
          {path: missing.path, offset: 0},
        )
        if (destination === null) {
          declinedMoves.push(move)
          pending.splice(pending.indexOf(missing), 1)
          continue
        }
        const destinationPath = destination.path as StepPath
        const parent = destinationPath.slice(0, -1)
        const toIndex =
          missing.index! -
          (pathEquals(from.slice(0, -1), parent) && fromIndex < missing.index!
            ? 1
            : 0)
        const to =
          typeof missing.path.at(-1) === 'number'
            ? [...parent, toIndex]
            : destinationPath
        const numeric = indexStates
          .flatMap((state) => state.points)
          .filter((path) => !pathEquals(path, move.to))
          .map(lift)
        const sourceShift = numeric.some(
          (path) =>
            pathEquals(path.slice(0, -1), from.slice(0, -1)) &&
            typeof path.at(-1) === 'number' &&
            (path.at(-1) as number) > fromIndex,
        )
        const afterRemoval = numeric.map(
          (path) =>
            (mapPoint([{type: 'remove.node', path: from, index: fromIndex}], {
              path,
              offset: 0,
            })?.path ?? []) as StepPath,
        )
        const destinationShift = afterRemoval.some(
          (path) =>
            pathEquals(path.slice(0, -1), parent) &&
            typeof path.at(-1) === 'number' &&
            (path.at(-1) as number) >= toIndex,
        )
        pending.splice(pending.indexOf(missing), 1)
        emit({
          type: 'move.node',
          from,
          to,
          ...(sourceShift ? {fromIndex} : {}),
          ...(destinationShift ? {toIndex} : {}),
        })
      } else {
        pending.splice(pending.indexOf(missing), 1)
      }
      continue
    }
    if (supersededSlots.has(slotIndex) || nulledRemovalSlots.has(slotIndex)) {
      outputMarkAtRemoval.set(slotIndex, steps.length)
      for (const removal of removalCandidates) {
        if (removal.slotIndex === slotIndex) {
          sourceEndAtRemoval.set(slotIndex, {
            path: lift(removal.from.path),
            offset: removal.sourceLength,
          })
        }
      }
      const alreadyMoved =
        relocatedRemovalBySlot.get(slotIndex)?.afterInsertionSlot
      const earlyPair = pairings.find(
        (pair) =>
          pair.removal.slotIndex === slotIndex &&
          pair.insertion.slotIndex < slotIndex,
      )
      if (
        original?.type === 'remove.node' &&
        ((alreadyMoved !== undefined && alreadyMoved < slotIndex) || earlyPair)
      ) {
        emit(translate(original))
        continue
      }
      if (
        original?.type === 'remove.node' &&
        (wholeNodeConsumedSlots.has(slotIndex) ||
          relocatedRemovalBySlot.has(slotIndex) ||
          nulledRemovalSlots.has(slotIndex))
      ) {
        defer(slotIndex, original)
      }
      continue
    }
    const membershipMoves = moveAtMembership.get(slotIndex)
    if (membershipMoves) {
      const fact = memberships.get(slotIndex)!
      let index = fact.index
      for (let member = 0; member < fact.count!; member++) {
        const move = membershipMoves.find((move) =>
          pathEquals(move.to, fact.insertedPaths![member]!),
        )
        if (!move) {
          if (original?.type === 'insert.node') {
            emit({
              type: 'insert.node',
              path: lift([...fact.path, index]),
              count: 1,
            })
          }
          index++
          continue
        }
        if (move.removalSlotIndex > slotIndex) {
          const path = lift(move.to)
          const at = lift([...fact.path, index]).at(-1) as number
          const transient = pathEquals(move.from, move.to)
          if (transient) {
            emit({type: 'move.node', from: lift(move.from), to: path})
          }
          pending.push({
            slot: move.removalSlotIndex,
            path,
            index: at,
            shift: false,
            delta: -1,
            ...(transient ? {} : {move}),
          })
          index++
          continue
        }
        const source = pending.find((p) => p.slot === move.removalSlotIndex)
        if (!source) {
          if (original?.type === 'insert.node') {
            emit({
              type: 'insert.node',
              path: lift([...fact.path, index]),
              count: 1,
            })
          }
          index++
          continue
        }
        const fromIndex = source.index
        const affects = (
          paths: StepPath[],
          parent: StepPath,
          index: number,
          inclusive: boolean,
        ) =>
          paths.some(
            (path) =>
              path.length === parent.length + 1 &&
              pathEquals(path.slice(0, -1), parent) &&
              typeof path.at(-1) === 'number' &&
              (inclusive
                ? (path.at(-1) as number) >= index
                : (path.at(-1) as number) > index),
          )
        const fromShift =
          fromIndex !== undefined &&
          affects(
            indexStates.flatMap((state) => state.points).map(lift),
            source.path.slice(0, -1),
            fromIndex,
            false,
          )
        pending.splice(pending.indexOf(source), 1)
        // Lift the destination after removing this retained source.
        const toIndex = lift([...fact.path, index]).at(-1) as number
        const to =
          typeof move.to.at(-1) === 'number'
            ? [...lift(fact.path), toIndex]
            : [...lift(fact.path), move.to.at(-1)!]
        emit({
          type: 'move.node',
          from: source.path,
          to,
          ...(fromShift ? {fromIndex} : {}),
          ...(affects(
            indexStates.flatMap((state) => state.points).map(lift),
            to.slice(0, -1),
            toIndex,
            true,
          )
            ? {toIndex}
            : {}),
        })
        index++
      }
      continue
    }
    const nodeMove = nodeMoveByInsertionSlot.get(slotIndex)
    if (nodeMove) {
      if (wholeMoves.has(nodeMove)) {
        continue
      }
      const source = pending.find((p) => p.slot === nodeMove.removalSlotIndex)
      const from = source
        ? [
            ...source.path,
            ...nodeMove.from.slice(
              (slots[nodeMove.removalSlotIndex] as {path: StepPath}).path
                .length,
            ),
          ]
        : lift(nodeMove.from)
      emit({type: 'move.node', from, to: lift(nodeMove.to)}, source)
      if (
        relocatedRemovalBySlot.get(nodeMove.removalSlotIndex)
          ?.afterInsertionSlot === slotIndex
      ) {
        finishRemoval(nodeMove.removalSlotIndex)
      }
      continue
    }
    const pairing = pairingsByInsertionSlot.get(slotIndex)
    if (pairing) {
      const {removal, insertion} = pairing
      const source = pending.find((p) => p.slot === removal.slotIndex)
      const removalStep = slots[removal.slotIndex]
      const from =
        source && removalStep?.type === 'remove.node'
          ? {
              ...removal.from,
              path: [
                ...source.path,
                ...removal.from.path.slice(removalStep.path.length),
              ],
            }
          : removal.isNodeRemoval
            ? {...removal.from, path: lift(removal.from.path)}
            : mapRemovalForward(
                steps.slice(outputMarkAtRemoval.get(removal.slotIndex) ?? 0),
                removal.from,
              )
      const capturedEnd = sourceEndAtRemoval.get(removal.slotIndex)
      const sourceEnd = capturedEnd
        ? replaySourceEnd(
            steps.slice(outputMarkAtRemoval.get(removal.slotIndex) ?? 0),
            capturedEnd,
          )
        : {path: from.path, offset: removal.sourceLength}
      emit(
        {
          type: 'move.text',
          from,
          to: {path: lift(insertion.path), offset: insertion.offset},
        },
        source,
      )
      if (
        sourceEnd &&
        pathEquals(sourceEnd.path, from.path) &&
        sourceEnd.offset === from.offset + from.length
      ) {
        emit(
          {
            type: 'move.text',
            from: {...from, offset: from.offset + from.length, length: 0},
            to: {
              path: lift(insertion.path),
              offset: insertion.offset + from.length,
            },
          },
          source,
        )
      }
      if (removal.isNodeRemoval) {
        if (source) {
          finishRemoval(removal.slotIndex)
        } else if (removalStep && removal.slotIndex < insertion.slotIndex) {
          emit(translate(removalStep))
        }
      }
      continue
    }
    if (original) {
      emit(translate(original))
    }
  }

  return declinedMoves.length > 0 ? {rejectedMoves: declinedMoves} : steps
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
      isValidMoveClaim(removal.text, insertion.text) &&
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
 * insertion whose span reuses an unrelated key still needs two
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
 * block still needs two characters.
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

function replaySourceEnd(steps: ReadonlyArray<Step>, end: Point): Point | null {
  let current: Point | null = end
  for (const step of steps) {
    if (!current) {
      return null
    }
    if (step.type === 'move.text') {
      if (pathEquals(current.path, step.from.path)) {
        current = {...current, offset: current.offset - step.from.length}
      }
      if (pathEquals(current.path, step.to.path)) {
        current = {...current, offset: current.offset + step.from.length}
      }
    } else {
      current = mapPoint([step], current)
    }
  }
  return current
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

function nodeText(
  node: unknown,
  root: unknown,
  path: StepPath,
  context?: TextContext,
): string | undefined {
  return isTextSpan(node, root, path, context?.schema, context?.arrays)
    ? node.text
    : undefined
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
  root: unknown,
  path: StepPath,
  context?: TextContext,
): Array<{_key?: string; text?: string}> {
  const segments = arraySegments(children)
  return children.map((child, index) => {
    const key = nodeKey(child)
    const text = nodeText(child, root, [...path, segments[index]!], context)
    return {
      ...(key === undefined ? {} : {_key: key}),
      ...(text === undefined ? {} : {text}),
    }
  })
}

function concatenatedSpanText(
  children: Array<unknown>,
  root: unknown,
  path: StepPath,
  context?: TextContext,
): string {
  const segments = arraySegments(children)
  let text = ''
  for (const [index, child] of children.entries()) {
    const childText = nodeText(
      child,
      root,
      [...path, segments[index]!],
      context,
    )
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
  root: unknown,
  context?: TextContext,
): {path: StepPath; text: string} | undefined {
  const representative = representativeSpan(node, path, root, context)
  const children = nodeChildren(node)
  if (representative === undefined || children === undefined) {
    return representative
  }
  const segments = arraySegments(children)
  const withText = children.filter(
    (child, index) =>
      (
        nodeText(
          child,
          root,
          [...path, 'children', segments[index]!],
          context,
        ) ?? ''
      ).length > 0,
  )
  return withText.length !== 1
    ? representative
    : {
        path: [...path, 'children', segments[children.indexOf(withText[0])]!],
        text: representative.text,
      }
}

function representativeSpan(
  node: unknown,
  path: StepPath,
  root: unknown,
  context?: TextContext,
): {path: StepPath; text: string} | undefined {
  const text = nodeText(node, root, path, context)
  if (text !== undefined) {
    return {path, text}
  }

  const children = nodeChildren(node)
  if (children === undefined) {
    return undefined
  }

  const segments = arraySegments(children)
  const firstSpanIndex = children.findIndex(
    (child, index) =>
      nodeText(
        child,
        root,
        [...path, 'children', segments[index]!],
        context,
      ) !== undefined,
  )
  if (firstSpanIndex < 0) {
    return undefined
  }

  return {
    path: [...path, 'children', segments[firstSpanIndex]!],
    text: concatenatedSpanText(children, root, [...path, 'children'], context),
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
    case 'insert.node':
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
 * to see. Traversal includes arrays and object-valued fields without a context.
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
    case 'insert.node':
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
  context?: TextContext,
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
      nodeText(oldNode, base, oldRoot, context) !== undefined ||
      invalidationPaths.some(
        (path) => pathContains(path, oldRoot) || pathContains(oldRoot, path),
      )
    ) {
      continue
    }
    const parentPath = oldRoot.slice(0, -1)
    const oldSiblings = getValue(base, parentPath, context?.arrays)
    const newSiblings = getValue(finalValue, parentPath, context?.arrays)
    if (!Array.isArray(oldSiblings) || !Array.isArray(newSiblings)) {
      continue
    }
    const index = arrayIndex(oldSiblings, oldRoot.at(-1), context?.arrays)
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
      arraySegment(newSiblings, index, context?.arrays)!,
    ]
    // Replay already converted this address at its patch slot. Repeating
    // that conversion before sibling shifts uses a final index too early.
    const replayed = mapPoint(steps, {path: oldRoot, offset: 0})
    if (replayed && pathEquals(replayed.path, newRoot)) {
      continue
    }
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
  const pending: Array<{
    oldNode: unknown
    newNode: unknown
    parentPath: StepPath
    oldPath?: StepPath
    newSegment?: StepPath[number]
  }> = [{oldNode, newNode, parentPath}]
  while (pending.length > 0) {
    const current = pending.pop()!
    const {oldNode, newNode, parentPath} = current
    if (Array.isArray(oldNode) && Array.isArray(newNode)) {
      const oldSegments = arraySegments(oldNode)
      const newSegments = arraySegments(newNode)
      const children = []
      for (
        let index = 0;
        index < Math.min(oldNode.length, newNode.length);
        index++
      ) {
        const oldPath: StepPath = [...parentPath, oldSegments[index]!]
        const newSegment = newSegments[index]!
        const newPath: StepPath = [...parentPath, newSegment]
        children.push({
          oldNode: oldNode[index],
          newNode: newNode[index],
          parentPath: newPath,
          oldPath,
          newSegment,
        })
      }
      for (const child of children.reverse()) {
        pending.push(child)
      }
    } else if (isRecord(oldNode) && isRecord(newNode)) {
      for (const [field, oldChild] of Object.entries(oldNode).reverse()) {
        pending.push({
          oldNode: oldChild,
          newNode: newNode[field],
          parentPath: [...parentPath, field],
        })
      }
    }
    if (current.oldPath && current.newSegment !== undefined) {
      const oldPath = current.oldPath
      const newSegment = current.newSegment
      if (!pathEquals(oldPath, parentPath)) {
        steps.push(
          isKeyedSegment(newSegment)
            ? {type: 'set.key', path: oldPath, newKey: newSegment._key}
            : {type: 'move.node', from: oldPath, to: parentPath},
        )
      }
    }
  }
}

function structurallyEqualWithoutKeys(left: unknown, right: unknown): boolean {
  const pending = [{left, right}]
  while (pending.length > 0) {
    const {left, right} = pending.pop()!
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) {
        return false
      }
      for (let index = 0; index < left.length; index++) {
        pending.push({left: left[index], right: right[index]})
      }
    } else if (isRecord(left) && isRecord(right)) {
      const entries = Object.entries(left).filter(([key]) => key !== '_key')
      if (
        entries.length !==
        Object.keys(right).filter((key) => key !== '_key').length
      ) {
        return false
      }
      for (const [key, value] of entries) {
        pending.push({left: value, right: right[key]})
      }
    } else if (left !== right) {
      return false
    }
  }
  return true
}

type ArrayMembership = {
  path: StepPath
  index: number
  count?: number
  shift: boolean
  destinationShift?: boolean
  insertedPaths?: StepPath[]
}

type ArrayIndexSnapshot = {
  path: StepPath
  ranges: Array<[number, number]>
}

function arrayIndexRanges(segments: StepPath): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  for (let index = 0; index < segments.length; index++) {
    if (typeof segments[index] !== 'number') {
      continue
    }
    const previous = ranges.at(-1)
    if (previous && previous[1] === index - 1) {
      previous[1] = index
    } else {
      ranges.push([index, index])
    }
  }
  return ranges
}

/** All routes that alter an array's addresses use this comparison. Numeric
 * shifts still execute at their patch slot. Key-to-index conversions execute
 * before key assignments, so a renamed twin cannot capture another point. */
function reconcileArrayAddresses(
  before: unknown,
  after: unknown,
  patch: Patch,
  numeric: any[],
  arrays: ArrayKeyCache,
  collectIndices: boolean,
): {
  before: Step[]
  after: Step[]
  indices?: {
    path: StepPath
    before: Array<[number, number]>
    after: Array<[number, number]>
  }
} {
  const out: {
    before: Step[]
    after: Step[]
    indices?: {
      path: StepPath
      before: Array<[number, number]>
      after: Array<[number, number]>
    }
  } = {before: [], after: []}
  let arrayPath: StepPath
  let kind: 'insert' | 'unset' | 'rename' | 'replaceArray'
  if (patch.type === 'insert') {
    arrayPath = patch.path.slice(0, -1) as StepPath
    kind = 'insert'
  } else if (patch.type === 'unset' && typeof numeric.at(-1) === 'number') {
    arrayPath = patch.path.slice(0, -1) as StepPath
    kind = 'unset'
  } else if (
    (patch.type === 'set' || patch.type === 'unset') &&
    patch.path.at(-1) === '_key'
  ) {
    arrayPath = patch.path.slice(0, -2) as StepPath
    kind = 'rename'
  } else if (patch.type === 'set' && Array.isArray(patch.value)) {
    arrayPath = patch.path as StepPath
    kind = 'replaceArray'
  } else {
    return out
  }
  const a = getValue(before, arrayPath, arrays),
    b = getValue(after, arrayPath, arrays)
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return out
  }
  const old = arraySegments(a, arrays),
    next = arraySegments(b, arrays)
  if (collectIndices) {
    out.indices = {
      path: arrayPath,
      before: arrayIndexRanges(old),
      after: arrayIndexRanges(next),
    }
  }
  const index = kind === 'rename' ? numeric.at(-2) : numeric.at(-1)
  const inserted =
    kind === 'insert'
      ? b.length -
        a.length +
        (patch.type === 'insert' && patch.position === 'replace' && a.length
          ? 1
          : 0)
      : 0
  const start =
    kind === 'insert'
      ? a.length
        ? index +
          (patch.type === 'insert' && patch.position === 'after' ? 1 : 0)
        : 0
      : index
  const removed =
    kind === 'unset' ||
    (kind === 'insert' &&
      patch.type === 'insert' &&
      patch.position === 'replace')
      ? 1
      : 0
  const pre: Array<{from: StepPath[number]; to: StepPath[number]}> = []
  const post: Array<{from: StepPath[number]; to: StepPath[number]}> = []
  for (let i = 0; i < a.length; i++) {
    if (removed && i === index) {
      continue
    }
    let j = i
    if (kind === 'insert') {
      j = i < start ? i : i + inserted - removed
    }
    if (kind === 'unset') {
      j = i < index ? i : i - 1
    }
    if (kind === 'replaceArray') {
      const key = nodeKey(a[i])
      j =
        key && old[i] && isKeyedSegment(old[i])
          ? b.findIndex((item) => nodeKey(item) === key)
          : a[i] === b[i]
            ? i
            : -1
    }
    const previous = old[i]!
    const current = next[j]
    if (
      j < 0 ||
      j >= b.length ||
      previous === current ||
      (isKeyedSegment(previous) &&
        isKeyedSegment(current) &&
        previous._key === current._key)
    ) {
      continue
    }
    if (kind === 'rename' || kind === 'replaceArray') {
      post.push({from: old[i]!, to: next[j]!})
    } else {
      const from = isKeyedSegment(old[i]) ? old[i]! : j
      if (isKeyedSegment(old[i]) && typeof next[j] === 'number') {
        pre.push({from: old[i]!, to: i})
      } else if (isKeyedSegment(next[j])) {
        post.push({from, to: next[j]!})
      }
    }
  }
  // EDITOR_CONCERNS: every route vacates ambiguous keys before assigning unique keys.
  for (const entry of [
    ...pre,
    ...post.filter((entry) => typeof entry.to === 'number'),
  ]) {
    out.before.push({
      type: 'move.node',
      from: [...arrayPath, entry.from],
      to: [...arrayPath, entry.to],
    })
  }
  for (const entry of post.filter((entry) => isKeyedSegment(entry.to))) {
    out.after.push({
      type: 'set.key',
      path: [...arrayPath, entry.from],
      newKey: (entry.to as {_key: string})._key,
    })
  }
  return out
}

/** A key proposes a move. Equal captured content validates the claim.
 * Both direct and descendant key matches use this predicate, as do text
 * insertion and fold matches on their captured strings. No oracle identity
 * is treated specially. Optional base/final evidence comes from replay lineage.
 */
function isValidMoveClaim(
  source: unknown,
  inserted: unknown,
  base?: unknown,
  final?: unknown,
): boolean {
  return [source, base].some(
    (left) =>
      left !== undefined &&
      [inserted, final].some(
        (right) => right !== undefined && equalSnapshot(left, right),
      ),
  )
}

function equalSnapshot(source: unknown, inserted: unknown): boolean {
  const pending = [{source, inserted}]
  while (pending.length > 0) {
    const {source, inserted} = pending.pop()!
    if (source === inserted) {
      continue
    }
    if (Array.isArray(source) && Array.isArray(inserted)) {
      if (source.length !== inserted.length) {
        return false
      }
      for (let index = 0; index < source.length; index++) {
        pending.push({source: source[index], inserted: inserted[index]})
      }
    } else if (isRecord(source) && isRecord(inserted)) {
      const entries = Object.entries(source)
      if (entries.length !== Object.keys(inserted).length) {
        return false
      }
      for (const [key, value] of entries) {
        if (!Object.prototype.hasOwnProperty.call(inserted, key)) {
          return false
        }
        pending.push({source: value, inserted: inserted[key]})
      }
    } else {
      return false
    }
  }
  return true
}

/** Carry a node's numeric address through one replay patch. Replacement
 * values have new lineage even when they reuse an old key or array slot. */
function replayNodePath(
  path: StepPath,
  patch: Patch,
  numeric: StepPath,
  before: unknown,
  after: unknown,
): StepPath | undefined {
  if (patch.type === 'insert') {
    const parent = numeric.slice(0, -1)
    if (!pathContains(parent, path) || path.length <= parent.length) {
      return path
    }
    const a = getValue(before, parent),
      b = getValue(after, parent)
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return path
    }
    const index = numeric.at(-1) as number
    const removed = patch.position === 'replace' && a.length > 0 ? 1 : 0
    const count = b.length - a.length + removed
    const start = a.length ? index + (patch.position === 'after' ? 1 : 0) : 0
    const child = path[parent.length] as number
    if (removed && child === index) {
      return undefined
    }
    if (child < start) {
      return path
    }
    return [
      ...parent,
      child + count - removed,
      ...path.slice(parent.length + 1),
    ]
  }
  if (patch.type === 'unset') {
    if (pathContains(numeric, path)) {
      return undefined
    }
    const parent = numeric.slice(0, -1),
      index = numeric.at(-1)
    if (
      typeof index === 'number' &&
      pathContains(parent, path) &&
      path.length > parent.length
    ) {
      const child = path[parent.length] as number
      if (child > index) {
        return [...parent, child - 1, ...path.slice(parent.length + 1)]
      }
    }
  }
  if (
    (patch.type === 'set' || patch.type === 'setIfMissing') &&
    pathContains(numeric, path)
  ) {
    if (patch.type === 'set' || getValue(before, numeric) === undefined) {
      return undefined
    }
  }
  return path
}

type NodeOrigins = {
  source: unknown
  preExisting?: boolean
  indexOffset?: number
  items?: Array<NodeOrigins | undefined>
  fields?: Map<string, NodeOrigins>
}

function collectOrigins(
  value: unknown,
  preExistingKeys: Set<string>,
): {origins: NodeOrigins; preExistingNodePaths: NodeOrigins} {
  const origins: NodeOrigins = {source: value}
  const preExistingNodePaths: NodeOrigins = {source: value}
  const pending = [{value, origin: origins, preExisting: preExistingNodePaths}]
  while (pending.length) {
    const {value, origin, preExisting} = pending.pop()!
    if (Array.isArray(value)) {
      const segments = arraySegments(value)
      const preExistingItems: Array<NodeOrigins> = []
      origin.items = value.map((child, index) => {
        const childOrigin: NodeOrigins = {source: child}
        const childPreExisting: NodeOrigins = {source: child}
        const segment = segments[index]!
        if (isKeyedSegment(segment)) {
          childPreExisting.preExisting = true
          preExistingKeys.add(segment._key)
        }
        pending.push({
          value: child,
          origin: childOrigin,
          preExisting: childPreExisting,
        })
        preExistingItems[index] = childPreExisting
        return childOrigin
      })
      preExisting.items = preExistingItems
    } else if (isRecord(value)) {
      origin.fields = new Map()
      preExisting.fields = new Map()
      for (const [field, child] of Object.entries(value)) {
        if (typeof child === 'object' && child !== null) {
          const childOrigin: NodeOrigins = {source: child}
          const childPreExisting: NodeOrigins = {source: child}
          origin.fields.set(field, childOrigin)
          preExisting.fields.set(field, childPreExisting)
          pending.push({
            value: child,
            origin: childOrigin,
            preExisting: childPreExisting,
          })
        }
      }
    }
  }
  return {origins, preExistingNodePaths}
}

function nodeOrigin(
  root: NodeOrigins | undefined,
  path: StepPath,
): NodeOrigins | undefined {
  let origin = root
  for (const segment of path) {
    origin =
      typeof segment === 'number'
        ? origin?.items?.[segment - (origin.indexOffset ?? 0)]
        : typeof segment === 'string'
          ? origin?.fields?.get(segment)
          : undefined
    if (!origin) {
      return undefined
    }
  }
  return origin
}

function replayPreExistingNodePaths(
  root: NodeOrigins | undefined,
  patch: Patch,
  numeric: StepPath,
  before: unknown,
  after: unknown,
): NodeOrigins | undefined {
  if (
    !root ||
    (patch.type !== 'insert' &&
      patch.type !== 'unset' &&
      patch.type !== 'set' &&
      patch.type !== 'setIfMissing') ||
    (patch.type === 'setIfMissing' && getValue(before, numeric) !== undefined)
  ) {
    return root
  }
  if (numeric.length === 0) {
    return patch.type === 'insert' ? root : undefined
  }
  const parentPath = numeric.slice(0, -1)
  const parent = nodeOrigin(root, parentPath)
  if (!parent) {
    return root
  }
  const segment = numeric.at(-1)!
  if (patch.type === 'insert') {
    const previous = getValue(before, parentPath)
    const next = getValue(after, parentPath)
    if (
      !Array.isArray(previous) ||
      !Array.isArray(next) ||
      typeof segment !== 'number'
    ) {
      return root
    }
    const removed = patch.position === 'replace' && previous.length > 0 ? 1 : 0
    const count = next.length - previous.length + removed
    const start = previous.length
      ? segment + (patch.position === 'after' ? 1 : 0)
      : 0
    const offset = parent.indexOffset ?? 0
    if (start < offset) {
      parent.indexOffset = offset + count - removed
    } else if (parent.items && start - offset < parent.items.length) {
      parent.items.splice(
        start - offset,
        removed,
        ...new Array<NodeOrigins | undefined>(count).fill(undefined),
      )
    }
  } else if (typeof segment === 'number' && patch.type === 'unset') {
    const offset = parent.indexOffset ?? 0
    if (segment < offset) {
      // `replayNodePath` shifts later slots even for an ignored negative anchor.
      parent.indexOffset = offset - 1
    } else {
      parent.items?.splice(segment - offset, 1)
    }
  } else if (typeof segment === 'number') {
    const index = segment - (parent.indexOffset ?? 0)
    if (parent.items && index >= 0 && index < parent.items.length) {
      parent.items[index] = undefined
    }
  } else if (typeof segment === 'string') {
    parent.fields?.delete(segment)
  }
  return root
}

function replayOrigins(
  root: NodeOrigins | undefined,
  path: StepPath,
  patch: Patch,
): NodeOrigins | undefined {
  if (
    !root ||
    patch.type === 'diffMatchPatch' ||
    patch.type === 'inc' ||
    patch.type === 'dec'
  ) {
    return root
  }
  if (path.length === 0) {
    return patch.type === 'set' || patch.type === 'unset' ? undefined : root
  }
  const origin = nodeOrigin(root, path.slice(0, -1))
  if (!origin) {
    return root
  }
  const segment = path.at(-1)!
  if (typeof segment === 'number' && origin.items) {
    if (patch.type === 'insert') {
      const index =
        origin.items.length === 0
          ? 0
          : segment + (patch.position === 'after' ? 1 : 0)
      origin.items.splice(
        index,
        patch.position === 'replace' && origin.items.length > 0 ? 1 : 0,
        ...patch.items.map(() => undefined),
      )
    } else if (patch.type === 'unset') {
      origin.items.splice(segment, 1)
    } else if (patch.type === 'set') {
      origin.items[segment] = undefined
    }
  } else if (
    typeof segment === 'string' &&
    (patch.type === 'set' || patch.type === 'unset')
  ) {
    origin.fields?.delete(segment)
  }
  return root
}
