import type {Path} from '@portabletext/editor'
import {useDropPosition} from '@portabletext/plugin-dnd'
import type {JSX} from 'react'

/**
 * The drop-indicator line for a new-pipeline block. The engine draws this
 * chrome for legacy top-level blocks but deliberately not for `defineX`
 * renders, so containers and their nested blocks draw it themselves from the
 * position `@portabletext/plugin-dnd` tracks. Mirrors the engine's
 * `pt-drop-indicator`: a 1px `currentColor` line at the block's top edge for a
 * `'start'` drop, the bottom edge for `'end'`.
 *
 * `position: absolute` keeps it out of flow, so the block element it renders
 * into must be `relative`. A `<span>` (not a `<div>`) so it stays valid markup
 * inside a `<p>` text block.
 */
export function BlockDropIndicator({path}: {path: Path}): JSX.Element | null {
  const position = useDropPosition(path)

  if (position === undefined) {
    return null
  }

  return (
    <span
      contentEditable={false}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        [position === 'start' ? 'top' : 'bottom']: 0,
        height: 0,
        borderTop: '1px solid currentColor',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  )
}
