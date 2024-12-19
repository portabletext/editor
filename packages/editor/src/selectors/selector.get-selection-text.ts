import {isPortableTextSpan, isPortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isKeyedSegment} from '../editor/utils/utils.is-keyed-segment'
import {reverseSelection} from '../editor/utils/utils.reverse-selection'

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

  for (const block of value) {
    if (
      isKeyedSegment(forwardSelection.anchor.path[0]) &&
      block._key !== forwardSelection.anchor.path[0]._key
    ) {
      continue
    }

    if (!isPortableTextTextBlock(block)) {
      continue
    }

    for (const child of block.children) {
      if (isPortableTextSpan(child)) {
        if (
          isKeyedSegment(forwardSelection.anchor.path[2]) &&
          child._key === forwardSelection.anchor.path[2]._key &&
          isKeyedSegment(forwardSelection.focus.path[2]) &&
          child._key === forwardSelection.focus.path[2]._key
        ) {
          text =
            text +
            child.text.slice(
              forwardSelection.anchor.offset,
              forwardSelection.focus.offset,
            )

          break
        }

        if (
          isKeyedSegment(forwardSelection.anchor.path[2]) &&
          child._key === forwardSelection.anchor.path[2]._key
        ) {
          text = text + child.text.slice(forwardSelection.anchor.offset)
          continue
        }

        if (
          isKeyedSegment(forwardSelection.focus.path[2]) &&
          child._key === forwardSelection.focus.path[2]._key
        ) {
          text = text + child.text.slice(0, forwardSelection.focus.offset)
          break
        }

        if (text.length > 0) {
          text + child.text
        }
      }
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
