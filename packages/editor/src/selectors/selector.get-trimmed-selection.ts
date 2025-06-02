import type {PortableTextBlock, PortableTextSpan} from '@sanity/types'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorSelection} from '../editor/editor-selection'
import {
  getIndexedSelection,
  getKeyedSelection,
  type KeyedEditorSelection,
  type KeyedEditorSelectionPoint,
} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {isEmptyTextBlock, isKeyedSegment} from '../utils'
import {isSelectionCollapsed} from '../utils/util.is-selection-collapsed'

/**
 * @public
 */
export const getTrimmedSelection: EditorSelector<EditorSelection> = (
  snapshot,
) => {
  const keyedSelection = getKeyedSelection(
    snapshot.context.schema,
    snapshot.context.value,
    snapshot.context.selection,
  )

  if (!keyedSelection) {
    return null
  }

  const trimmedKeyedSelection = trimKeyedSelection({
    schema: snapshot.context.schema,
    selection: keyedSelection,
    value: snapshot.context.value,
  })

  return getIndexedSelection(
    snapshot.context.schema,
    snapshot.context.value,
    trimmedKeyedSelection,
  )
}

function trimKeyedSelection({
  schema,
  selection,
  value,
}: {
  schema: EditorSchema
  selection: KeyedEditorSelection
  value: PortableTextBlock[]
}) {
  if (!selection) {
    return selection
  }

  const startPoint = selection.backward ? selection.focus : selection.anchor
  const endPoint = selection.backward ? selection.anchor : selection.focus

  if (!startPoint || !endPoint) {
    return selection
  }

  const startBlockKey = isKeyedSegment(startPoint.path[0])
    ? startPoint.path[0]._key
    : null
  const startChildKey = isKeyedSegment(startPoint.path[2])
    ? startPoint.path[2]._key
    : null
  const endBlockKey = isKeyedSegment(endPoint.path[0])
    ? endPoint.path[0]._key
    : null
  const endChildKey = isKeyedSegment(endPoint.path[2])
    ? endPoint.path[2]._key
    : null

  if (!startBlockKey || !endBlockKey) {
    return selection
  }

  let startBlockFound = false
  let adjustedStartPoint: KeyedEditorSelectionPoint | undefined
  let trimStartPoint = false
  let adjustedEndPoint: KeyedEditorSelectionPoint | undefined
  let trimEndPoint = false
  let previousPotentialEndpoint:
    | {blockKey: string; span: PortableTextSpan}
    | undefined

  for (const block of value) {
    if (block._key === startBlockKey) {
      startBlockFound = true

      if (isTextBlock({schema}, block) && isEmptyTextBlock({schema}, block)) {
        continue
      }
    }

    if (!startBlockFound) {
      continue
    }

    if (!isTextBlock({schema}, block)) {
      continue
    }

    if (block._key === endBlockKey && isEmptyTextBlock({schema}, block)) {
      break
    }

    for (const child of block.children) {
      if (child._key === endChildKey) {
        if (!isSpan({schema}, child) || endPoint.offset === 0) {
          adjustedEndPoint = previousPotentialEndpoint
            ? {
                path: [
                  {_key: previousPotentialEndpoint.blockKey},
                  'children',
                  {_key: previousPotentialEndpoint.span._key},
                ],
                offset: previousPotentialEndpoint.span.text.length,
              }
            : undefined

          trimEndPoint = true
          break
        }
      }

      if (trimStartPoint) {
        const lonelySpan =
          isSpan({schema}, child) && block.children.length === 1

        if ((isSpan({schema}, child) && child.text.length > 0) || lonelySpan) {
          adjustedStartPoint = {
            path: [{_key: block._key}, 'children', {_key: child._key}],
            offset: 0,
          }
          previousPotentialEndpoint = {blockKey: block._key, span: child}
          trimStartPoint = false
        }

        continue
      }

      if (child._key === startChildKey) {
        if (!isSpan({schema}, child)) {
          trimStartPoint = true
          continue
        }

        if (startPoint.offset === child.text.length) {
          trimStartPoint = true
          previousPotentialEndpoint =
            child.text.length > 0
              ? {blockKey: block._key, span: child}
              : previousPotentialEndpoint
          continue
        }
      }

      previousPotentialEndpoint =
        isSpan({schema}, child) && child.text.length > 0
          ? {blockKey: block._key, span: child}
          : previousPotentialEndpoint
    }

    if (block._key === endBlockKey) {
      break
    }
  }

  const trimmedSelection = selection.backward
    ? {
        anchor: trimEndPoint && adjustedEndPoint ? adjustedEndPoint : endPoint,
        focus: adjustedStartPoint ?? startPoint,
        backward: true,
      }
    : {
        anchor: adjustedStartPoint ?? startPoint,
        focus: trimEndPoint && adjustedEndPoint ? adjustedEndPoint : endPoint,
      }

  if (isSelectionCollapsed(trimmedSelection)) {
    const focusBlockKey = isKeyedSegment(trimmedSelection.focus.path[0])
      ? trimmedSelection.focus.path[0]._key
      : null

    if (!focusBlockKey) {
      return null
    }

    const focusTextBlock = value.find(
      (block) => block._key === focusBlockKey && isTextBlock({schema}, block),
    )

    if (focusTextBlock && !isEmptyTextBlock({schema}, focusTextBlock)) {
      return null
    }
  }

  return trimmedSelection
}
