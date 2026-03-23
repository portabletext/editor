import type {Path} from '../interfaces/path'

export function pathHasPrevious(path: Path): boolean {
  return path[path.length - 1]! > 0
}
