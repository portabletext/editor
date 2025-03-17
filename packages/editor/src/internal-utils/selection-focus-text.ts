import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelection} from '../types/editor'
import {isKeyedSegment} from '../utils'

export function getSelectionFocusText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
) {
  if (!value || !selection) {
    return undefined
  }

  let text: string | undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      if (
        isKeyedSegment(selection.focus.path[0]) &&
        block._key === selection.focus.path[0]._key
      ) {
        for (const child of block.children) {
          if (isPortableTextSpan(child)) {
            if (
              isKeyedSegment(selection.focus.path[2]) &&
              child._key === selection.focus.path[2]._key
            ) {
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
