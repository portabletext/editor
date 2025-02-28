import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type RefObject,
} from 'react'
import {Path, Transforms, type Element as SlateElement} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {debugWithName} from '../../internal-utils/debug'
import {
  IS_DRAGGING,
  IS_DRAGGING_BLOCK_ELEMENT,
  IS_DRAGGING_BLOCK_TARGET_POSITION,
  IS_DRAGGING_ELEMENT_TARGET,
} from '../../internal-utils/weakMaps'

const debug = debugWithName('useDraggable')

type Draggable = {
  draggableProps: {
    draggable: boolean
    onDragStart?: (event: DragEvent) => void
    onDrag?: (event: DragEvent) => void
    onDragEnd?: (event: DragEvent) => void
  }
}

export function useDraggable(props: {
  element: SlateElement
  readOnly: boolean
  blockRef: RefObject<HTMLDivElement | null>
}): Draggable {
  const editor = useSlateStatic()
  const dragGhostRef = useRef<HTMLElement>(undefined)
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

  // Note: this is called for the dragging block
  const handleDragEnd = useCallback(
    (event: DragEvent) => {
      const targetBlock = IS_DRAGGING_ELEMENT_TARGET.get(editor)
      if (targetBlock) {
        IS_DRAGGING.set(editor, false)
        event.preventDefault()
        event.stopPropagation()
        IS_DRAGGING_ELEMENT_TARGET.delete(editor)
        if (dragGhostRef.current) {
          debug('Removing drag ghost')
          document.body.removeChild(dragGhostRef.current)
        }
        const dragPosition = IS_DRAGGING_BLOCK_TARGET_POSITION.get(editor)
        IS_DRAGGING_BLOCK_TARGET_POSITION.delete(editor)
        let targetPath = ReactEditor.findPath(editor, targetBlock)
        const myPath = ReactEditor.findPath(editor, props.element)
        const isBefore = Path.isBefore(myPath, targetPath)
        if (dragPosition === 'bottom' && !isBefore) {
          // If it is already at the bottom, don't do anything.
          if (targetPath[0] >= editor.children.length - 1) {
            debug('target is already at the bottom, not moving')
            return
          }
          const originalPath = targetPath
          targetPath = Path.next(targetPath)
          debug(
            `Adjusting targetPath from ${JSON.stringify(originalPath)} to ${JSON.stringify(
              targetPath,
            )}`,
          )
        }
        if (
          dragPosition === 'top' &&
          isBefore &&
          targetPath[0] !== editor.children.length - 1
        ) {
          const originalPath = targetPath
          targetPath = Path.previous(targetPath)
          debug(
            `Adjusting targetPath from ${JSON.stringify(originalPath)} to ${JSON.stringify(
              targetPath,
            )}`,
          )
        }
        if (Path.equals(targetPath, myPath)) {
          event.preventDefault()
          debug('targetPath and myPath is the same, not moving')
          return
        }
        debug(
          `Moving element ${props.element._key} from path ${JSON.stringify(myPath)} to ${JSON.stringify(
            targetPath,
          )} (${dragPosition})`,
        )
        Transforms.moveNodes(editor, {at: myPath, to: targetPath})
        editor.onChange()
        return
      }
      debug('No target element, not doing anything')
    },
    [editor, props.element],
  )

  // Note: this is called for the dragging block
  const handleDrag = useCallback(
    (event: DragEvent) => {
      IS_DRAGGING.set(editor, true)
      IS_DRAGGING_BLOCK_ELEMENT.set(editor, props.element)
      event.stopPropagation() // Stop propagation so that leafs don't get this and take focus/selection!

      const target = event.target

      if (target instanceof HTMLElement) {
        target.style.opacity = '1'
      }
    },
    [editor, props.element],
  )

  // Note: this is called for the dragging block
  const handleDragStart = useCallback(
    (event: DragEvent) => {
      debug('Drag start')
      IS_DRAGGING.set(editor, true)
      if (event.dataTransfer) {
        event.dataTransfer.setData('application/portable-text', 'something')
        event.dataTransfer.effectAllowed = 'move'
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
          dragGhostRef.current = dragGhost
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
        }
      }
      handleDrag(event)
    },
    [blockElement, editor, handleDrag],
  )

  if (props.readOnly) {
    return {
      draggableProps: {
        draggable: false,
        onDragStart: undefined,
        onDrag: undefined,
        onDragEnd: undefined,
      },
    }
  }

  return {
    draggableProps: {
      draggable: true,
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
    },
  }
}
