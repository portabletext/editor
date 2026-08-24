import type {Path} from '@portabletext/editor'
import {useDropPosition} from '@portabletext/plugin-dnd'
import {useContext, type JSX, type ReactNode} from 'react'
import {EditorFeatureFlagsContext} from '../feature-flags'

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

/**
 * Wraps a nested block render in the `relative` positioning context the
 * indicator needs, or renders the children bare when the plugin is off.
 */
export function WithBlockDropIndicator(props: {
  path: Path
  children: ReactNode
}): JSX.Element {
  const flags = useContext(EditorFeatureFlagsContext)
  return flags.dndPlugin ? (
    <div className="relative">
      {props.children}
      <BlockDropIndicator path={props.path} />
    </div>
  ) : (
    <>{props.children}</>
  )
}
