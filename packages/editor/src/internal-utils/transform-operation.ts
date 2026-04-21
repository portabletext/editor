import type {Patch} from '@portabletext/patches'
import {
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  parsePatch,
} from '@sanity/diff-match-patch'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import type {Node} from '../slate/interfaces/node'
import type {Operation} from '../slate/interfaces/operation'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {debug} from './debug'

/**
 * This will adjust the operation paths and offsets according to the
 * remote patches by other editors since the step operations was performed.
 *
 * With keyed paths, block-level path adjustments are no-ops because keys
 * are stable across insertions and removals. Only text offsets within
 * the same node need adjustment (diffMatchPatch).
 */
export function transformOperation(
  editor: PortableTextSlateEditor,
  patch: Patch,
  operation: Operation,
): Operation[] {
  const transformedOperation = {...operation}

  if (patch.type === 'insert') {
    // With keyed paths, block insertions don't affect other operations' paths.
    // Keys are stable - no path adjustment needed.
    debug.history(
      `No path adjustment needed for '${transformedOperation.type}' operation and patch '${patch.type}' (keyed paths)`,
    )
    return [transformedOperation]
  }

  if (patch.type === 'unset' && patch.path.length > 0) {
    // If this operation targets the same block that got removed, drop it.
    // With keyed paths, other operations' paths don't need adjustment.
    if (
      'path' in transformedOperation &&
      Array.isArray(transformedOperation.path)
    ) {
      const removedBlock = getEnclosingBlock(editor, patch.path)
      const operationBlock = getEnclosingBlock(
        editor,
        transformedOperation.path,
      )
      if (
        removedBlock &&
        operationBlock &&
        removedBlock.node._key === operationBlock.node._key
      ) {
        debug.history('Skipping transformation that targeted removed block')
        return []
      }
    }
    return [transformedOperation]
  }

  // Someone reset the whole value
  if (patch.type === 'unset' && patch.path.length === 0) {
    debug.history(
      `Adjusting selection for unset everything patch and ${operation.type} operation`,
    )
    return []
  }

  if (patch.type === 'diffMatchPatch') {
    const operationTargetBlock = findOperationTargetBlock(
      editor,
      transformedOperation,
    )
    const patchTargetBlock = getEnclosingBlock(editor, patch.path)
    if (
      !operationTargetBlock ||
      !patchTargetBlock ||
      operationTargetBlock._key !== patchTargetBlock.node._key
    ) {
      return [transformedOperation]
    }
    const diffPatches = parsePatch(patch.value)
    diffPatches.forEach((diffPatch) => {
      let adjustOffsetBy = 0
      let changedOffset = diffPatch.utf8Start1
      const {diffs} = diffPatch
      diffs.forEach((diff, index) => {
        const [diffType, text] = diff
        if (diffType === DIFF_INSERT) {
          adjustOffsetBy += text.length
          changedOffset += text.length
        } else if (diffType === DIFF_DELETE) {
          adjustOffsetBy -= text.length
          changedOffset -= text.length
        } else if (diffType === DIFF_EQUAL) {
          // Only up to the point where there are no other changes
          if (!diffs.slice(index).every(([dType]) => dType === DIFF_EQUAL)) {
            changedOffset += text.length
          }
        }
      })
      // Adjust accordingly if someone inserted text in the same node before us
      if (transformedOperation.type === 'insert_text') {
        if (changedOffset < transformedOperation.offset) {
          transformedOperation.offset += adjustOffsetBy
        }
      }
      // Adjust accordingly if someone removed text in the same node before us
      if (transformedOperation.type === 'remove_text') {
        if (
          changedOffset <=
          transformedOperation.offset - transformedOperation.text.length
        ) {
          transformedOperation.offset += adjustOffsetBy
        }
      }
      // Adjust set_selection operation's points to new offset
      if (transformedOperation.type === 'set_selection') {
        const currentFocus = transformedOperation.properties?.focus
          ? {...transformedOperation.properties.focus}
          : undefined
        const currentAnchor = transformedOperation?.properties?.anchor
          ? {...transformedOperation.properties.anchor}
          : undefined
        const newFocus = transformedOperation?.newProperties?.focus
          ? {...transformedOperation.newProperties.focus}
          : undefined
        const newAnchor = transformedOperation?.newProperties?.anchor
          ? {...transformedOperation.newProperties.anchor}
          : undefined
        if ((currentFocus && currentAnchor) || (newFocus && newAnchor)) {
          const points = [currentFocus, currentAnchor, newFocus, newAnchor]
          points.forEach((point) => {
            if (point && changedOffset < point.offset) {
              point.offset += adjustOffsetBy
            }
          })
          if (currentFocus && currentAnchor) {
            transformedOperation.properties = {
              focus: currentFocus,
              anchor: currentAnchor,
            }
          }
          if (newFocus && newAnchor) {
            transformedOperation.newProperties = {
              focus: newFocus,
              anchor: newAnchor,
            }
          }
        }
      }
    })
    return [transformedOperation]
  }
  return [transformedOperation]
}

function findOperationTargetBlock(
  editor: PortableTextSlateEditor,
  operation: Operation,
): Node | undefined {
  if (operation.type === 'set_selection' && editor.selection) {
    const block = getEnclosingBlock(editor, editor.selection.focus.path)
    return block?.node
  }
  if ('path' in operation) {
    const block = getEnclosingBlock(editor, operation.path)
    return block?.node
  }
  return undefined
}
