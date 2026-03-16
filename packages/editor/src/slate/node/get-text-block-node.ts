import type {PortableTextTextBlock} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNode} from './get-node'

export function getTextBlockNode(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
): PortableTextTextBlock {
  const node = getNode(root, path, schema)

  if (isTextBlock({schema}, node)) {
    return node
  }

  throw new Error(
    `Cannot get the text block at path [${path}] because it refers to a non-text-block node: ${safeStringify(node)}`,
  )
}
