import type {Path} from '../interfaces/path'

/**
 * Split a path into the owning node's path (up to and including the
 * last keyed or numeric segment) and the trailing property segments
 * after it. Everything after the last keyed or numeric segment is a
 * string by construction, so stripping the trailing string run is
 * equivalent to scanning for that segment. Paths without keyed or
 * numeric segments split into an empty node path and the whole path
 * as properties.
 */
export function splitNodePath(path: Path): {
  nodePath: Path
  propertyPath: Array<string>
} {
  let nodePathEnd = path.length
  while (nodePathEnd > 0 && typeof path[nodePathEnd - 1] === 'string') {
    nodePathEnd--
  }
  return {
    nodePath: path.slice(0, nodePathEnd),
    propertyPath: path.slice(nodePathEnd) as Array<string>,
  }
}
