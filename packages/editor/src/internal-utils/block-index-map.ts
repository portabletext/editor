import {serializePath} from '../paths/serialize-path'

/**
 * A `Map<string, number>` keyed by serialized keyed paths (e.g.
 * `[_key=="b0"]`). `.get` and `.has` accept either a serialized path or a
 * bare `_key` so older consumers reading by `_key` keep working.
 */
export class BlockIndexMap extends Map<string, number> {
  override get(key: string): number | undefined {
    if (key.startsWith('[_key==')) {
      return super.get(key)
    }
    return super.get(serializePath([{_key: key}]))
  }

  override has(key: string): boolean {
    if (key.startsWith('[_key==')) {
      return super.has(key)
    }
    return super.has(serializePath([{_key: key}]))
  }
}
