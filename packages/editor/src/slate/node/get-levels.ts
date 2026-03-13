import type {EditorSchema} from '../../editor/editor-schema'
import type {Node, NodeEntry, NodeLevelsOptions} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {pathLevels} from '../path/path-levels'
import {getNode} from './get-node'

export function* getLevels(
  root: Node,
  path: Path,
  schema: EditorSchema,
  options: NodeLevelsOptions = {},
): Generator<NodeEntry, void, undefined> {
  for (const p of pathLevels(path, options)) {
    const n = getNode(root, p, schema)
    yield [n, p]
  }
}
