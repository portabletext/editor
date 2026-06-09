import {useEditor} from '@portabletext/editor'
import type {BehaviorEvent} from '@portabletext/editor/behaviors'
import {useEffect, useState, type ReactNode} from 'react'
import {DropPositionContext, type DropPosition} from './drop-position-context'

type DragDragoverEvent = Extract<BehaviorEvent, {type: 'drag.dragover'}>
type DragEndEvent = Extract<BehaviorEvent, {type: 'drag.dragend'}>
type DragDropEvent = Extract<BehaviorEvent, {type: 'drag.drop'}>
type DragLeaveEvent = Extract<BehaviorEvent, {type: 'drag.dragleave'}>

/**
 * Subscribes to drag events on the editor and publishes the current drop
 * target via React context. Mount once inside an `EditorProvider`. Children
 * (or any component below in the tree) can read the current drop target with
 * the `useDropPosition` hook.
 *
 * Activation gates: drop target only published while the user is dragging
 * something from inside the same editor (`event.dragOrigin` set). Cleared
 * on any other `drag.*` event (dragend, drop, dragleave).
 */
export function DropPositionPlugin({
  children,
}: {
  children?: ReactNode
}): ReactNode {
  const editor = useEditor()
  const [dropPosition, setDropPosition] = useState<DropPosition | undefined>()

  useEffect(() => {
    const subscriptions = [
      editor.on('drag.dragover', (event: DragDragoverEvent) => {
        if (!event.dragOrigin) {
          setDropPosition(undefined)
          return
        }
        // Strip everything after the first segment so the indicator paints
        // on the block itself, not a span inside it.
        const blockPath = event.position.selection.focus.path.slice(0, 1)
        setDropPosition({path: blockPath, position: event.position.block})
      }),
      editor.on('drag.dragend', (_event: DragEndEvent) => {
        setDropPosition(undefined)
      }),
      editor.on('drag.drop', (_event: DragDropEvent) => {
        setDropPosition(undefined)
      }),
      editor.on('drag.dragleave', (_event: DragLeaveEvent) => {
        setDropPosition(undefined)
      }),
    ]

    return () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe()
      }
    }
  }, [editor])

  return (
    <DropPositionContext.Provider value={dropPosition}>
      {children}
    </DropPositionContext.Provider>
  )
}
