import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  parsePatch,
} from '@sanity/diff-match-patch'
import {isEqual} from 'lodash'
import type {Descendant, Operation} from 'slate'
import {debugWithName} from '../internal-utils/debug'
import type {PortableTextSlateEditor} from '../types/slate-editor'

const debug = debugWithName('transformOperation')
const debugVerbose = debug.enabled && false

/**
 * This will adjust the operation paths and offsets according to the
 * remote patches by other editors since the step operations was performed.
 */
export function transformOperation(
  editor: PortableTextSlateEditor,
  patch: Patch,
  operation: Operation,
  snapshot: PortableTextBlock[] | undefined,
  previousSnapshot: PortableTextBlock[] | undefined,
): Operation[] {
  if (debugVerbose) {
    debug(
      `Adjusting '${operation.type}' operation paths for '${patch.type}' patch`,
    )
    debug(`Operation ${JSON.stringify(operation)}`)
    debug(`Patch ${JSON.stringify(patch)}`)
  }

  const transformedOperation = {...operation}

  if (patch.type === 'insert' && patch.path.length === 1) {
    const insertBlockIndex = (snapshot || []).findIndex((blk) =>
      isEqual({_key: blk._key}, patch.path[0]),
    )
    debug(
      `Adjusting block path (+${patch.items.length}) for '${transformedOperation.type}' operation and patch '${patch.type}'`,
    )
    return [
      adjustBlockPath(
        transformedOperation,
        patch.items.length,
        insertBlockIndex,
      ),
    ]
  }

  if (patch.type === 'unset' && patch.path.length === 1) {
    const unsetBlockIndex = (previousSnapshot || []).findIndex((blk) =>
      isEqual({_key: blk._key}, patch.path[0]),
    )
    // If this operation is targeting the same block that got removed, return empty
    if (
      'path' in transformedOperation &&
      Array.isArray(transformedOperation.path) &&
      transformedOperation.path[0] === unsetBlockIndex
    ) {
      debug('Skipping transformation that targeted removed block')
      return []
    }
    if (debugVerbose) {
      debug(`Selection ${JSON.stringify(editor.selection)}`)
      debug(
        `Adjusting block path (-1) for '${transformedOperation.type}' operation and patch '${patch.type}'`,
      )
    }
    return [adjustBlockPath(transformedOperation, -1, unsetBlockIndex)]
  }

  // Someone reset the whole value
  if (patch.type === 'unset' && patch.path.length === 0) {
    debug(
      `Adjusting selection for unset everything patch and ${operation.type} operation`,
    )
    return []
  }

  if (patch.type === 'diffMatchPatch') {
    const operationTargetBlock = findOperationTargetBlock(
      editor,
      transformedOperation,
    )
    if (
      !operationTargetBlock ||
      !isEqual({_key: operationTargetBlock._key}, patch.path[0])
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
/**
 * Adjust the block path for a operation
 */
function adjustBlockPath(
  operation: Operation,
  level: number,
  blockIndex: number,
): Operation {
  const transformedOperation = {...operation}
  if (
    blockIndex >= 0 &&
    transformedOperation.type !== 'set_selection' &&
    Array.isArray(transformedOperation.path) &&
    transformedOperation.path[0] >= blockIndex + level &&
    transformedOperation.path[0] + level > -1
  ) {
    const newPath = [
      transformedOperation.path[0] + level,
      ...transformedOperation.path.slice(1),
    ]
    transformedOperation.path = newPath
  }
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
        if (
          point &&
          point.path[0] >= blockIndex + level &&
          point.path[0] + level > -1
        ) {
          point.path = [point.path[0] + level, ...point.path.slice(1)]
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
  //   // Assign fresh point objects (we don't want to mutate the original ones)
  return transformedOperation
}

function findOperationTargetBlock(
  editor: PortableTextSlateEditor,
  operation: Operation,
): Descendant | undefined {
  let block: Descendant | undefined
  if (operation.type === 'set_selection' && editor.selection) {
    block = editor.children[editor.selection.focus.path[0]]
  } else if ('path' in operation) {
    block = editor.children[operation.path[0]]
  }
  return block
}
