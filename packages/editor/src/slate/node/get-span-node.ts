import type {PortableTextSpan} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNode} from './get-node'

export function getSpanNode(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
): PortableTextSpan {
  const node = getNode(root, path, schema)

  if (isSpan({schema}, node)) {
    return node
  }

  throw new Error(
    `Cannot get the span at path [${path}] because it refers to a non-span node: ${safeStringify(node)}`,
  )
}
