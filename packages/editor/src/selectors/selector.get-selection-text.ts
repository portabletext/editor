import {isPortableTextSpan, isPortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {reverseSelection} from '../utils/util.reverse-selection'

/**
 * @public
 */
export const getSelectionText: EditorSelector<string> = ({context}) => {
  let text = ''

  const {value, selection} = context

  if (!value || !selection) {
    return text
  }

  const forwardSelection = selection.backward
    ? reverseSelection(selection)
    : selection

  if (!forwardSelection) {
    return text
  }

  const startBlockKey = isKeyedSegment(forwardSelection.anchor.path[0])
    ? forwardSelection.anchor.path[0]._key
    : undefined
  const endBlockKey = isKeyedSegment(forwardSelection.focus.path[0])
    ? forwardSelection.focus.path[0]._key
    : undefined
  const startChildKey = isKeyedSegment(forwardSelection.anchor.path[2])
    ? forwardSelection.anchor.path[2]._key
    : undefined
  const endChildKey = isKeyedSegment(forwardSelection.focus.path[2])
    ? forwardSelection.focus.path[2]._key
    : undefined
  let startFound = false

  if (!startBlockKey || !endBlockKey) {
    return text
  }

  for (const block of value) {
    if (block._key === startBlockKey) {
      if (!isPortableTextTextBlock(block)) {
        continue
      }

      for (const child of block.children) {
        if (child._key === startChildKey) {
          startFound = true
        }

        if (!startFound) {
          continue
        }

        if (isPortableTextSpan(child) && startChildKey) {
          if (child._key === startChildKey && child._key === endChildKey) {
            text =
              text +
              child.text.slice(
                forwardSelection.anchor.offset,
                forwardSelection.focus.offset,
              )
          } else if (child._key === startChildKey) {
            text = text + child.text.slice(forwardSelection.anchor.offset)
          } else if (child._key === endChildKey) {
            text = text + child.text.slice(0, forwardSelection.focus.offset)
          } else {
            text = text + child.text
          }
        }

        if (child._key === endChildKey) {
          break
        }
      }
      continue
    }

    if (block._key === endBlockKey) {
      if (!isPortableTextTextBlock(block)) {
        continue
      }

      for (const child of block.children) {
        if (isPortableTextSpan(child) && endChildKey) {
          text = text + child.text.slice(0, forwardSelection.focus.offset)
        }

        if (child._key === endChildKey) {
          break
        }
      }
      break
    }
  }

  return text
}
