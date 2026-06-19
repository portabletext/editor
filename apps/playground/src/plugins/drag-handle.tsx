import {GripVerticalIcon} from 'lucide-react'
import type {JSX} from 'react'

/**
 * A small corner handle that owns the container's drag affordance.
 *
 * The handle sits inside the container's render so its DOM ancestor with
 * a `data-pt-path` attribute is the container itself. `getEventPosition`
 * resolves the dragstart event's path to that container path and starts
 * a chrome drag of the whole container.
 *
 * Kept off the outer container element so cells, inline objects, and
 * text selection inside the container behave like a non-draggable
 * editable region (browsers swallow some selection-driven copy events
 * when the selection lives inside a `draggable={true}` ancestor).
 */
export function DragHandle({
  className,
  readOnly,
}: {
  className?: string
  readOnly: boolean
}): JSX.Element {
  return (
    <span
      aria-hidden
      contentEditable={false}
      draggable={!readOnly}
      title="Drag to move"
      className={`absolute top-1 right-1 z-10 inline-flex h-5 w-5 cursor-grab items-center justify-center rounded text-stone-400 opacity-0 transition-opacity hover:bg-stone-200/60 hover:text-stone-600 group-hover:opacity-100 dark:text-stone-500 dark:hover:bg-stone-700/60 dark:hover:text-stone-300 ${className ?? ''}`}
    >
      <GripVerticalIcon className="h-4 w-4" />
    </span>
  )
}
