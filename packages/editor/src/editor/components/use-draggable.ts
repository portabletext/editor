import {
  useCallback,
  useContext,
  useEffect,
  useState,
  type DragEvent,
  type RefObject,
} from 'react'
import type {Element as SlateElement} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {getEventPosition} from '../../internal-utils/event-position'
import {EditorActorContext} from '../editor-actor-context'
import {getEditorSnapshot} from '../editor-selector'

type Draggable = {
  draggableProps: {
    draggable: boolean
    onDragStart?: (event: DragEvent) => void
    onDragEnd?: (event: DragEvent) => void
  }
}

export function useDraggable(props: {
  element: SlateElement
  readOnly: boolean
  blockRef: RefObject<HTMLDivElement | null>
}): Draggable {
  const editorActor = useContext(EditorActorContext)
  const editor = useSlateStatic()
  const [blockElement, setBlockElement] = useState<HTMLElement | null>(null)

  useEffect(
    () =>
      setBlockElement(
        props.blockRef
          ? props.blockRef.current
          : ReactEditor.toDOMNode(editor, props.element),
      ),
    [editor, props.element, props.blockRef],
  )

  const handleDragEnd = useCallback(() => {
    editorActor.send({type: 'dragend'})
  }, [editorActor])

  const handleDragStart = useCallback(
    (event: DragEvent) => {
      const position = getEventPosition({
        snapshot: getEditorSnapshot({
          editorActorSnapshot: editorActor.getSnapshot(),
          slateEditorInstance: editor,
        }),
        slateEditor: editor,
        event: event.nativeEvent,
      })

      if (!position) {
        console.error('Could not find position for dragstart event')
        return
      }

      // Clone blockElement so that it will not be visually clipped by scroll-containers etc.
      // The application that uses the portable-text-editor may indicate the element used as
      // drag ghost by adding a truthy data attribute 'data-pt-drag-ghost-element' to a HTML element.
      if (blockElement && blockElement instanceof HTMLElement) {
        let dragGhost = blockElement.cloneNode(true) as HTMLElement
        const customGhost = dragGhost.querySelector(
          '[data-pt-drag-ghost-element]',
        )
        if (customGhost) {
          dragGhost = customGhost as HTMLElement
        }

        // Set the `data-dragged` attribute so the consumer can style the element while it’s dragged
        dragGhost.setAttribute('data-dragged', '')

        if (document.body) {
          dragGhost.style.position = 'absolute'
          dragGhost.style.left = '-99999px'
          dragGhost.style.boxSizing = 'border-box'
          document.body.appendChild(dragGhost)
          const rect = blockElement.getBoundingClientRect()
          const x = event.clientX - rect.left
          const y = event.clientY - rect.top
          dragGhost.style.width = `${rect.width}px`
          dragGhost.style.height = `${rect.height}px`
          event.dataTransfer.setDragImage(dragGhost, x, y)

          editorActor.send({
            type: 'dragstart',
            origin: position,
            ghost: dragGhost,
          })
          return
        }

        editorActor.send({
          type: 'dragstart',
          origin: position,
        })
      }
    },
    [blockElement, editor, editorActor],
  )

  if (props.readOnly) {
    return {
      draggableProps: {
        draggable: false,
        onDragStart: undefined,
        onDragEnd: undefined,
      },
    }
  }

  return {
    draggableProps: {
      draggable: true,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
    },
  }
}
