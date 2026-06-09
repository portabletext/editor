import type {Path} from '@portabletext/editor'
import {isEqualPaths} from '@portabletext/editor/utils'
import {useContext} from 'react'
import {DropPositionContext} from './drop-position-context'

/**
 * Returns `'start'` or `'end'` if the current drop target is the block at
 * the given path, or `undefined` otherwise.
 *
 * Use inside a `renderBlock` or `defineTextBlock`/`defineBlockObject`
 * render callback to show a drop indicator above (`'start'`) or below
 * (`'end'`) the block.
 *
 * Requires `<DropPositionPlugin />` to be mounted somewhere above in the
 * tree; without it, always returns `undefined`.
 */
export function useDropPosition(path: Path): 'start' | 'end' | undefined {
  const dropPosition = useContext(DropPositionContext)
  if (!dropPosition) {
    return undefined
  }
  if (!isEqualPaths(dropPosition.path, path)) {
    return undefined
  }
  return dropPosition.position
}
