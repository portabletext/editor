import type {PortableTextSpan} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import type {Editor} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNodes} from './get-nodes'

export function* getTexts(
  root: Editor | Node,
  schema: EditorSchema,
  options: {
    from?: Path
    to?: Path
    reverse?: boolean
    pass?: (node: NodeEntry) => boolean
  } = {},
): Generator<NodeEntry<PortableTextSpan>, void, undefined> {
  for (const [node, path] of getNodes(root, schema, options)) {
    if (isSpan({schema}, node)) {
      yield [node, path]
    }
  }
}
