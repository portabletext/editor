import type {EditorSchema} from '../../editor/editor-schema'
import type {Node, NodeEntry, NodeTextsOptions} from '../interfaces/node'
import {Text} from '../interfaces/text'
import {getNodes} from './get-nodes'

export function* getTexts(
  root: Node,
  schema: EditorSchema,
  options: NodeTextsOptions = {},
): Generator<NodeEntry<Text>, void, undefined> {
  for (const [node, path] of getNodes(root, schema, options)) {
    if (Text.isText(node, schema)) {
      yield [node, path]
    }
  }
}
