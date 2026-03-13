import type {Path} from '../interfaces/path'

export function pathEquals(path: Path, another: Path): boolean {
  return (
    path.length === another.length && path.every((n, i) => n === another[i]!)
  )
}
