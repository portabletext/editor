import type {Path} from '../interfaces/path'

export function nextPath(path: Path): Path {
  if (path.length === 0) {
    throw new Error(
      `Cannot get the next path of a root path [${path}], because it has no next index.`,
    )
  }

  const last = path[path.length - 1]!
  return path.slice(0, -1).concat(last + 1)
}
