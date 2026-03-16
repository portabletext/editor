import {
  isSpan,
  type PortableTextObject,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNode} from './get-node'
import {isObjectNode} from './is-object-node'

export function getLeaf(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
): PortableTextSpan | PortableTextObject {
  const node = getNode(root, path, schema)

  if (isSpan({schema}, node)) {
    return node
  }

  if (isObjectNode({schema}, node)) {
    return node
  }

  throw new Error(
    `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${safeStringify(
      node,
    )}`,
  )
}
