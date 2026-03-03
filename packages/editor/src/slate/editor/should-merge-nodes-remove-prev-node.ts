import {Element, Text, type EditorInterface} from '../interfaces'

export const shouldMergeNodesRemovePrevNode: EditorInterface['shouldMergeNodesRemovePrevNode'] =
  (_editor, [prevNode, prevPath], [_curNode, _curNodePath]) => {
    // If the target node that we're merging with is empty, remove it instead
    // of merging the two. This is a common rich text editor behavior to
    // prevent losing formatting when deleting entire nodes when you have a
    // hanging selection.
    // if prevNode is first child in parent,don't remove it.

    const isEmptyElement =
      Element.isElement(prevNode, _editor.schema) &&
      (prevNode.children.length === 0 ||
        (prevNode.children.length === 1 &&
          Text.isText(prevNode.children[0], _editor.schema) &&
          prevNode.children[0].text === ''))

    return (
      isEmptyElement ||
      (Text.isText(prevNode, _editor.schema) &&
        prevNode.text === '' &&
        prevPath[prevPath.length - 1] !== 0)
    )
  }
