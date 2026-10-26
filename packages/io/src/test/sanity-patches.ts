import {
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
  type Path,
} from '@portabletext/patches'

export function fromSanityPatches(json: string): Array<Patch> {
  const operations: unknown = JSON.parse(json)

  if (!Array.isArray(operations)) {
    throw new Error('Expected an array of Sanity patches')
  }

  return operations.flatMap((operation: Record<string, unknown>) =>
    Object.entries(operation).flatMap(([type, body]) =>
      fromOperation(type, body),
    ),
  )
}

function fromOperation(type: string, body: unknown): Array<Patch> {
  switch (type) {
    case 'set':
      return entries(body).map(([path, value]) => set(value, parsePath(path)))
    case 'setIfMissing':
      return entries(body).map(([path, value]) =>
        setIfMissing(value, parsePath(path)),
      )
    case 'unset':
      return (body as Array<string>).map((path) => unset(parsePath(path)))
    case 'diffMatchPatch':
      // One scenario writes `{"path": ..., "value": ...}` instead of
      // Sanity's `{<path>: <patch>}`. Both read the same here.
      if (isPathAndValue(body)) {
        return [
          {
            type: 'diffMatchPatch',
            path: parsePath(body.path),
            value: body.value,
          },
        ]
      }

      return entries(body).map(([path, value]) => ({
        type: 'diffMatchPatch',
        path: parsePath(path),
        value: String(value),
      }))
    case 'insert': {
      const {items, ...position} = body as Record<string, unknown>
      const [where, path] = Object.entries(position)[0] ?? []

      if (where !== 'before' && where !== 'after' && where !== 'replace') {
        throw new Error(`Unknown insert position "${where}"`)
      }

      return [insert(items as Array<unknown>, where, parsePath(String(path)))]
    }
    default:
      throw new Error(`Unknown Sanity patch "${type}"`)
  }
}

function isPathAndValue(body: unknown): body is {path: string; value: string} {
  return (
    typeof body === 'object' &&
    body !== null &&
    Object.keys(body).length === 2 &&
    typeof Reflect.get(body, 'path') === 'string' &&
    typeof Reflect.get(body, 'value') === 'string'
  )
}

function entries(body: unknown): Array<[string, unknown]> {
  return Object.entries(body as Record<string, unknown>)
}

function parsePath(path: string): Path {
  if (!path.startsWith('[')) {
    throw new Error(`A path into the field starts with a block: "${path}"`)
  }

  const segmentPattern =
    /\[_key=="([^"]*)"\]|\[(-?\d+)\]|\.?([A-Za-z_$][\w$]*)/y
  const segments: Path = []

  while (segmentPattern.lastIndex < path.length) {
    const match = segmentPattern.exec(path)

    if (match === null) {
      throw new Error(`Can't parse the path "${path}"`)
    }

    const [, key, index, field] = match

    if (key !== undefined) {
      segments.push({_key: key})
    } else if (index !== undefined) {
      segments.push(Number(index))
    } else if (field !== undefined) {
      segments.push(field)
    }
  }

  return segments
}
