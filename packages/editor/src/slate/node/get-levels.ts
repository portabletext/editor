import type {EditorSchema} from '../../editor/editor-schema'
import type {Editor} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {pathLevels} from '../path/path-levels'
import {getNode} from './get-node'

export function* getLevels(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  options: {reverse?: boolean} = {},
): Generator<NodeEntry, void, undefined> {
  for (const p of pathLevels(path, options)) {
    if (p.length === 0) {
      yield [root as Node, p]
      continue
    }

    const n = getNode(root, p, schema)
    yield [n, p]
  }
}
