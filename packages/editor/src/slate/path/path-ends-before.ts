import type {Path} from '../interfaces/path'

export function pathEndsBefore(path: Path, another: Path): boolean {
  const i = path.length - 1

  for (let j = 0; j < i; j++) {
    if (path[j] !== another[j]) {
      return false
    }
  }

  return path[i]! < another[i]!
}
