import type {Path} from '../interfaces/path'

export function pathLevels(path: Path): Path[] {
  const list: Path[] = []

  for (let i = 0; i <= path.length; i++) {
    list.push(path.slice(0, i))
  }

  return list
}
