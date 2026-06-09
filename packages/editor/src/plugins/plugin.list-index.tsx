import {useEngineSelector} from '../engine/react/hooks/use-engine-selector'
import {serializePath} from '../paths/serialize-path'
import type {Path} from '../types/paths'

/**
 * Returns the 1-based list-item index for the block at `path`, or `undefined`
 * when the block isn't a list item or doesn't participate in numbered list
 * counting.
 *
 * The engine paints this on the default `renderListItem` via the
 * `data-list-index` attribute. Use `useListIndex(props.path)` from a custom
 * `renderListItem` or container render callback to thread the same index
 * through your own markup.
 *
 * Only works for root-level blocks today. List items nested inside containers
 * return `undefined`.
 *
 * @beta
 */
export function useListIndex(path: Path): number | undefined {
  const serializedPath = serializePath(path)

  return useEngineSelector((engine) => engine.listIndexMap.get(serializedPath))
}
