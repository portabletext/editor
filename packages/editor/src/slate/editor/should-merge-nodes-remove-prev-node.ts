import {isSpan, isTextBlock} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'

export function shouldMergeNodesRemovePrevNode(
  editor: Editor,
  prev: {node: Node; path: Array<number>},
  _current: {node: Node; path: Array<number>},
): boolean {
  // If the target node that we're merging with is empty, remove it instead
  // of merging the two. This is a common rich text editor behavior to
  // prevent losing formatting when deleting entire nodes when you have a
  // hanging selection.
  // if prevNode is first child in parent,don't remove it.

  let isEmptyElement = false
  if (isTextBlock({schema: editor.schema}, prev.node)) {
    const prevChildren = prev.node.children
    isEmptyElement =
      prevChildren.length === 0 ||
      (prevChildren.length === 1 &&
        isSpan({schema: editor.schema}, prevChildren[0]) &&
        prevChildren[0].text === '')
  }

  return (
    isEmptyElement ||
    (isSpan({schema: editor.schema}, prev.node) &&
      prev.node.text === '' &&
      prev.path[prev.path.length - 1] !== 0)
  )
}
