import type {Path} from '../interfaces/path'

export function comparePaths(path: Path, another: Path): -1 | 0 | 1 {
  const min = Math.min(path.length, another.length)

  for (let i = 0; i < min; i++) {
    if (path[i]! < another[i]!) {
      return -1
    }
    if (path[i]! > another[i]!) {
      return 1
    }
  }

  return 0
}
