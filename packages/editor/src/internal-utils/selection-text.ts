import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelection} from '../types/editor'
import {isKeyedSegment} from '../utils'
import {reverseSelection} from '../utils/util.reverse-selection'

export function getSelectionText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
) {
  if (!value || !selection) {
    return undefined
  }

  const forwardSelection = selection.backward
    ? reverseSelection(selection)
    : selection

  if (!forwardSelection) {
    return undefined
  }

  const text: Array<string> = []

  for (const block of value) {
    if (
      text.length === 0 &&
      isKeyedSegment(forwardSelection.anchor.path[0]) &&
      block._key !== forwardSelection.anchor.path[0]._key
    ) {
      continue
    }

    if (text.length > 0) {
      text.push('|')
    }

    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          if (
            isKeyedSegment(forwardSelection.anchor.path[2]) &&
            child._key === forwardSelection.anchor.path[2]._key &&
            isKeyedSegment(forwardSelection.focus.path[2]) &&
            child._key === forwardSelection.focus.path[2]._key
          ) {
            text.push(
              child.text.slice(
                forwardSelection.anchor.offset,
                forwardSelection.focus.offset,
              ),
            )
            break
          }

          if (
            isKeyedSegment(forwardSelection.anchor.path[2]) &&
            child._key === forwardSelection.anchor.path[2]._key
          ) {
            text.push(child.text.slice(forwardSelection.anchor.offset))
            continue
          }

          if (
            isKeyedSegment(forwardSelection.focus.path[2]) &&
            child._key === forwardSelection.focus.path[2]._key
          ) {
            text.push(child.text.slice(0, forwardSelection.focus.offset))
            break
          }

          if (text.length > 0) {
            text.push(child.text)
          }
        }
      }
    } else {
      text.push(`[${block._type}]`)
    }

    if (
      isKeyedSegment(forwardSelection.focus.path[0]) &&
      block._key === forwardSelection.focus.path[0]._key
    ) {
      break
    }
  }

  return text
}
