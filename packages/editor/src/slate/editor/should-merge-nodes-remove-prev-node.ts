import {isSpan, isTextBlock} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'

export function shouldMergeNodesRemovePrevNode(
  _editor: Editor,
  [prevNode, prevPath]: NodeEntry<Node>,
  [_curNode, _curNodePath]: NodeEntry<Node>,
): boolean {
  // If the target node that we're merging with is empty, remove it instead
  // of merging the two. This is a common rich text editor behavior to
  // prevent losing formatting when deleting entire nodes when you have a
  // hanging selection.
  // if prevNode is first child in parent,don't remove it.

  let isEmptyElement = false
  if (isTextBlock({schema: _editor.schema}, prevNode)) {
    const prevChildren = prevNode.children
    isEmptyElement =
      prevChildren.length === 0 ||
      (prevChildren.length === 1 &&
        isSpan({schema: _editor.schema}, prevChildren[0]) &&
        prevChildren[0].text === '')
  }

  return (
    isEmptyElement ||
    (isSpan({schema: _editor.schema}, prevNode) &&
      prevNode.text === '' &&
      prevPath[prevPath.length - 1] !== 0)
  )
}
