import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {EditorSelection} from '../types/editor'

export function getSelectionFocusText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
) {
  if (!value || !selection) {
    return undefined
  }

  const focusBlockKey = getBlockKeyFromSelectionPoint(selection.focus)
  const focusChildKey = getChildKeyFromSelectionPoint(selection.focus)

  if (focusBlockKey === undefined || focusChildKey === undefined) {
    return undefined
  }

  let text: string | undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      if (block._key === focusBlockKey) {
        for (const child of block.children) {
          if (isPortableTextSpan(child)) {
            if (child._key === focusChildKey) {
              text = child.text
              break
            }
          }
        }
      }
    }
  }

  return text
}
