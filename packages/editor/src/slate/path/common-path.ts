import type {Path} from '../interfaces/path'

export function commonPath(path: Path, another: Path): Path {
  const common: Path = []

  for (let i = 0; i < path.length && i < another.length; i++) {
    const av = path[i]!
    const bv = another[i]!

    if (av !== bv) {
      break
    }

    common.push(av)
  }

  return common
}
