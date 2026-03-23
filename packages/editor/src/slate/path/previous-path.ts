import type {Path} from '../interfaces/path'

export function previousPath(path: Path): Path {
  if (path.length === 0) {
    throw new Error(
      `Cannot get the previous path of a root path [${path}], because it has no previous index.`,
    )
  }

  const last = path[path.length - 1]!

  if (last <= 0) {
    throw new Error(
      `Cannot get the previous path of a first child path [${path}] because it would result in a negative index.`,
    )
  }

  return path.slice(0, -1).concat(last - 1)
}
