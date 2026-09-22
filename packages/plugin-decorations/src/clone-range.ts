import type {EditorSelection, Path} from '@portabletext/editor'

/**
 * Keep in sync with `packages/editor/src/engine/range/clone-range.ts`:
 * duplicated here (rather than imported) because that module is an
 * editor internal, not public API.
 */
function clonePath(path: Path): Path {
  return path.map((segment) => {
    if (Array.isArray(segment)) {
      return [...segment]
    }

    return typeof segment === 'object' ? {...segment} : segment
  })
}

function clonePoint<TPoint extends {path: Path}>(point: TPoint): TPoint {
  return {...point, path: clonePath(point.path)}
}

export function cloneRange(
  range: NonNullable<EditorSelection>,
): NonNullable<EditorSelection> {
  return {
    ...range,
    anchor: clonePoint(range.anchor),
    focus: clonePoint(range.focus),
  }
}
