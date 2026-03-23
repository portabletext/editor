import type {Path, PathAncestorsOptions} from '../interfaces/path'
import {pathLevels} from './path-levels'

export function pathAncestors(
  path: Path,
  options: PathAncestorsOptions = {},
): Path[] {
  const {reverse = false} = options
  let paths = pathLevels(path, options)

  if (reverse) {
    paths = paths.slice(1)
  } else {
    paths = paths.slice(0, -1)
  }

  return paths
}
