import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Descendant, Node} from '../interfaces/node'
import {isText} from '../text/is-text'
import {isObjectNode} from './is-object-node'

export function getChild(
  root: Node,
  index: number,
  schema: EditorSchema,
): Descendant {
  if (isText(root, schema) || isObjectNode(root, schema)) {
    throw new Error(
      `Cannot get the child of a leaf node: ${safeStringify(root)}`,
    )
  }

  const c = root.children[index] as Descendant

  if (c == null) {
    throw new Error(
      `Cannot get child at index \`${index}\` in node: ${safeStringify(root)}`,
    )
  }

  return c
}
