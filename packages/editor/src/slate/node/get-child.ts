import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'

export function getChild(
  root: Editor | Node,
  index: number,
  schema: EditorSchema,
): Node {
  if (isEditor(root)) {
    return root.children[index]!
  }

  if (isTextBlock({schema}, root)) {
    return root.children[index]!
  }

  throw new Error(`Cannot get the child of a leaf node: ${safeStringify(root)}`)
}
