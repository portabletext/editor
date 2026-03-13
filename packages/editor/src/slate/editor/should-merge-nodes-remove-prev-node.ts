import {isElement} from '../element/is-element'
import type {Descendant, NodeEntry} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {isText} from '../text/is-text'

export function shouldMergeNodesRemovePrevNode(
  _editor: Editor,
  [prevNode, prevPath]: NodeEntry<Descendant>,
  [_curNode, _curNodePath]: NodeEntry<Descendant>,
): boolean {
  // If the target node that we're merging with is empty, remove it instead
  // of merging the two. This is a common rich text editor behavior to
  // prevent losing formatting when deleting entire nodes when you have a
  // hanging selection.
  // if prevNode is first child in parent,don't remove it.

  const isEmptyElement =
    isElement(prevNode, _editor.schema) &&
    (prevNode.children.length === 0 ||
      (prevNode.children.length === 1 &&
        isText(prevNode.children[0], _editor.schema) &&
        prevNode.children[0].text === ''))

  return (
    isEmptyElement ||
    (isText(prevNode, _editor.schema) &&
      prevNode.text === '' &&
      prevPath[prevPath.length - 1] !== 0)
  )
}
