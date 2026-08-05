import type {PortableTextTextBlock} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {withoutPatching} from '../../engine-plugins/engine-plugin.without-patching'
import {applyMergeNode} from '../../internal-utils/apply-merge-node'
import {debug} from '../../internal-utils/debug'
import {getChildren} from '../../traversal/get-children'
import {getTextBlock} from '../../traversal/get-text-block'
import {isObject} from '../../traversal/is-object'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import {createSpanNode} from '../node/create-span-node'
import {isTextBlockNode} from '../node/is-text-block-node'
import {textEquals} from '../text/text-equals'
import type {WithEditorFirstArg} from '../utils/types'
import {
  CORRECTIONS,
  type Correction,
  type CorrectionContext,
  rootNoBlocks,
} from './corrections'

/**
 * Run one correction. `undefined` from `correct` means "not my defect" -
 * the caller tries the next one. A returned operation list is the fix:
 * applied in order (under `withoutPatching` when the correction asks for
 * it), then control returns to the fixed-point normalize loop, which
 * re-visits whatever the fix left dirty.
 *
 * Cosmetic corrections are skipped while adopting remote content (see
 * `Correction['type']`); structural ones always run. `memoKey` below is the
 * other scheduling rule: it skips a correction whose sibling group a prior
 * visit already verified unique (see `verifiedUniqueChildGroups`).
 */
function tryCorrection(
  correction: Correction,
  context: CorrectionContext,
): boolean {
  const {editor} = context

  if (correction.type === 'cosmetic' && editor.isProcessingRemoteChanges) {
    return false
  }

  if (correction.memoKey) {
    const key = correction.memoKey(context)
    if (key !== undefined && editor.verifiedUniqueChildGroups.has(key)) {
      return false
    }
  }

  const operations = correction.correct(context)
  if (operations === undefined) {
    return false
  }

  debug.normalization(correction.name)

  const applyOperations = () => {
    for (const operation of operations) {
      editor.apply(operation)
    }
  }

  if (correction.suppressPatches) {
    withoutPatching(editor, applyOperations)
  } else {
    applyOperations()
  }

  return true
}

// `rootNoBlocks` (`CORRECTIONS[0]`) runs before the imperative same-marks
// merge below; every other correction runs after it, in `CORRECTIONS` order.
const remainingCorrections = CORRECTIONS.slice(1)

export const normalizeNode: WithEditorFirstArg<Editor['normalizeNode']> = (
  editor,
  entry,
) => {
  const [node, path] = entry
  const context: CorrectionContext = {editor, node, path}

  if (tryCorrection(rootNoBlocks, context)) {
    return
  }

  /**
   * Merge spans with same set of .marks
   *
   * Stays imperative: `applyMergeNode` pre-transforms refs/selection with
   * merge semantics and isn't expressible as a plain `EngineOperation`.
   * Once `merge` is a first-class operation, this can become a correction
   * like the others.
   */
  if (
    !editor.isProcessingRemoteChanges &&
    isTextBlock({schema: editor.snapshot.context.schema}, node)
  ) {
    const children = getChildren(editor.snapshot, path)

    for (let i = 0; i < children.length - 1; i++) {
      const {node: child} = children[i]!
      const {node: nextNode, path: nextChildPath} = children[i + 1]!

      if (
        isSpan({schema: editor.snapshot.context.schema}, child) &&
        isSpan({schema: editor.snapshot.context.schema}, nextNode) &&
        child.marks?.every((mark) => nextNode.marks?.includes(mark)) &&
        nextNode.marks?.every((mark) => child.marks?.includes(mark))
      ) {
        debug.normalization('merging spans with same marks')
        applyMergeNode(editor, nextChildPath, child.text.length)
        return
      }
    }
  }

  for (const correction of remainingCorrections) {
    if (tryCorrection(correction, context)) {
      return
    }
  }

  // Everything from here down is gated on `isTextBlockNode`. A span or an
  // object node reaching this point already exhausted the corrections that
  // match its shape above (`span.missing-text` etc. for spans;
  // `container.missing-child-array` etc., gated on `isObject`, for
  // objects), so neither can still be dirty here - there is nothing left
  // for either shape to fall through to.

  /**
   * Text blocks must always have at least one child span.
   *
   * Stays imperative: mutates and refetches `element` while iterating (a
   * fix can shift or remove nodes at the current index), which the
   * fixed-point re-entry model doesn't support mid-loop. Promoting
   * `merge` to an `EngineOperation` would let the merge/drop arm become a
   * correction; the bracketing arm has no such dependency but is left
   * alongside it for now.
   */
  if (isTextBlockNode({schema: editor.snapshot.context.schema}, node)) {
    // We will have to refetch the element any time we modify its children
    // since it clones to a new immutable reference when we do.
    let element = node as unknown as PortableTextTextBlock

    // Since we'll be applying operations while iterating, we also modify
    // `n` when adding/removing nodes.
    for (let n = 0; n < element.children.length; n++) {
      const child = element.children[n]!

      const prev: Node | undefined = element.children[n - 1]
      const childPath = [...path, 'children', {_key: child._key}]

      if (isSpan({schema: editor.snapshot.context.schema}, child)) {
        if (
          prev != null &&
          isSpan({schema: editor.snapshot.context.schema}, prev) &&
          // Only this merge/empty-drop arm defers; the inline-object
          // bracketing below is a repair and keeps running.
          !editor.isProcessingRemoteChanges
        ) {
          // Merge adjacent text nodes that are empty or match.
          if (child.text === '') {
            editor.apply({type: 'unset', path: childPath})
            const refetched = getTextBlock(editor.snapshot, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (prev.text === '') {
            const prevPath = [...path, 'children', {_key: prev._key}]
            editor.apply({type: 'unset', path: prevPath})
            const refetched = getTextBlock(editor.snapshot, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          } else if (textEquals(child, prev, {loose: true})) {
            applyMergeNode(editor, childPath, prev.text.length)
            const refetched = getTextBlock(editor.snapshot, path)?.node
            if (!refetched) {
              return
            }
            element = refetched
            n--
          }
        }
      } else if (isObject(editor.snapshot, child)) {
        if (
          prev == null ||
          !isSpan({schema: editor.snapshot.context.schema}, prev)
        ) {
          const newChild = createSpanNode(editor.snapshot.context)
          editor.apply({
            type: 'insert',
            path: childPath,
            node: newChild,
            position: 'before',
          })
          const refetched = getTextBlock(editor.snapshot, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
        if (n === element.children.length - 1) {
          const newChild = createSpanNode(editor.snapshot.context)
          editor.apply({
            type: 'insert',
            path: [...path, 'children', {_key: element.children[n]!._key}],
            node: newChild,
            position: 'after',
          })
          const refetched = getTextBlock(editor.snapshot, path)?.node
          if (!refetched) {
            return
          }
          element = refetched
          n++
        }
      }
    }

    return
  }
}
