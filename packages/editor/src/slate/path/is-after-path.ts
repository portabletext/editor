import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {comparePaths} from './compare-paths'

export function isAfterPath(
  path: Path,
  another: Path,
  root?: {children: Array<Node>},
): boolean {
  return comparePaths(path, another, root) === 1
}
