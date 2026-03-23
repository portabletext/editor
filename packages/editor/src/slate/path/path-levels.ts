import type {Path, PathLevelsOptions} from '../interfaces/path'

export function pathLevels(
  path: Path,
  options: PathLevelsOptions = {},
): Path[] {
  const {reverse = false} = options
  const list: Path[] = []

  for (let i = 0; i <= path.length; i++) {
    list.push(path.slice(0, i))
  }

  if (reverse) {
    list.reverse()
  }

  return list
}
