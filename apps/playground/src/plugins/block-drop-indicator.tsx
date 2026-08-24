import type {Path} from '@portabletext/editor'
import {useDropPosition} from '@portabletext/plugin-dnd'
import type {JSX} from 'react'

/**
 * `useDropPosition` throws below a missing `DndProvider`, so every caller
 * must be gated behind `featureFlags.dndPlugin` before it renders, and must
 * render inside a `position: relative` ancestor sized to the drop target so
 * the line lands on it.
 */
export function BlockDropIndicator(props: {path: Path}): JSX.Element | null {
  const dropPosition = useDropPosition(props.path)
  return dropPosition ? (
    <div
      contentEditable={false}
      className={`pointer-events-none absolute inset-x-0 h-0.5 bg-blue-500 dark:bg-blue-400 ${
        dropPosition === 'start' ? 'top-0' : 'bottom-0'
      }`}
    />
  ) : null
}
