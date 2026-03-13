import type {EditorSchema} from '../../editor/editor-schema'
import type {Node, NodeEntry, NodeLevelsOptions} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {getNode} from './get-node'

export function* getLevels(
  root: Node,
  path: Path,
  schema: EditorSchema,
  options: NodeLevelsOptions = {},
): Generator<NodeEntry, void, undefined> {
  for (const p of Path.levels(path, options)) {
    const n = getNode(root, p, schema)
    yield [n, p]
  }
}
