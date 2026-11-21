import {
  isTypedObject,
  isSpanNode,
  isTextBlockNode,
  type PortableTextObject,
} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {isEditableContainer} from '../schema/is-editable-container'
import {getNode} from './get-node'
import {isBlock} from './is-block'
import {isObject} from './is-object'
import {textView} from './text-view'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Check whether `node`, at `path`, is an object that is not a registered container.
 * A text block at a block position and a span inside such a text block are not objects.
 * Anything else with a `_type` is, including a span at a block position and a text block inside another text block's `children`.
 *
 * @public
 */
export function isLeafObject(
  snapshot: TraversalSnapshot,
  node: unknown,
  path: Path,
): node is PortableTextObject {
  if (snapshot.context.containers === undefined) {
    const view = textView(snapshot, path)
    return view
      ? isLeafObject(view.snapshot, node, view.path)
      : isObject(snapshot, node)
  }
  const entry = getNode(snapshot, path)
  return (
    isTypedObject(node) &&
    (entry === undefined
      ? isObject(snapshot, node)
      : isBlock(snapshot, path)
        ? !isTextBlockNode(snapshot.context, node)
        : !isSpanNode(snapshot.context, node)) &&
    !isEditableContainer(snapshot, node as PortableTextObject, path)
  )
}
