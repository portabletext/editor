import type {EditorSchema} from '../../editor/editor-schema'
import type {Descendant, Node} from '../interfaces/node'
import {Scrubber} from '../interfaces/scrubber'
import {Text} from '../interfaces/text'
import {isObjectNode} from './is-object-node'

export function getChild(
  root: Node,
  index: number,
  schema: EditorSchema,
): Descendant {
  if (Text.isText(root, schema) || isObjectNode(root, schema)) {
    throw new Error(
      `Cannot get the child of a leaf node: ${Scrubber.stringify(root)}`,
    )
  }

  const c = root.children[index] as Descendant

  if (c == null) {
    throw new Error(
      `Cannot get child at index \`${index}\` in node: ${Scrubber.stringify(
        root,
      )}`,
    )
  }

  return c
}
