import type React from 'react'
import {useCallback, useEffect, useState, type DragEvent} from 'react'
import type {Element as SlateElement} from 'slate'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {debugWithName} from '../../internal-utils/debug'
import {
  IS_DRAGGING_BLOCK_ELEMENT,
  IS_DRAGGING_BLOCK_TARGET_POSITION,
  IS_DRAGGING_ELEMENT_TARGET,
} from '../../internal-utils/weakMaps'

const debug = debugWithName('useDroppable')

type Droppable = {
  droppableProps: {
    onDragOver?: (event: DragEvent) => void
    onDragLeave?: () => void
    onDrop?: (event: DragEvent) => void
  }
  isDraggingOverTop: boolean
  isDraggingOverBottom: boolean
}

export function useDroppable(props: {
  element: SlateElement
  blockRef: React.RefObject<HTMLDivElement | null>
  readOnly: boolean
}): Droppable {
  const editor = useSlateStatic()
  const [isDragOver, setIsDragOver] = useState(false)
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

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      const isMyDragOver = IS_DRAGGING_BLOCK_ELEMENT.get(editor)
      // debug('Drag over', blockElement)
      if (!isMyDragOver || !blockElement) {
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      IS_DRAGGING_ELEMENT_TARGET.set(editor, props.element)
      const elementRect = blockElement.getBoundingClientRect()
      const offset = elementRect.top
      const height = elementRect.height
      const Y = event.pageY
      const loc = Math.abs(offset - Y)
      let position: 'top' | 'bottom' = 'bottom'
      if (props.element === editor.children[0]) {
        position = 'top'
      } else if (loc < height / 2) {
        position = 'top'
        IS_DRAGGING_BLOCK_TARGET_POSITION.set(editor, position)
      } else {
        position = 'bottom'
        IS_DRAGGING_BLOCK_TARGET_POSITION.set(editor, position)
      }
      if (isMyDragOver === props.element) {
        event.dataTransfer.dropEffect = 'none'
        return
      }
      setIsDragOver(true)
    },
    [blockElement, editor, props.element],
  )

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (IS_DRAGGING_BLOCK_ELEMENT.get(editor)) {
        debug('On drop (prevented)', props.element)
        event.preventDefault()
        event.stopPropagation()
        setIsDragOver(false)
      }
    },
    [editor, props.element],
  )

  const isDraggingOverFirstBlock =
    isDragOver && editor.children[0] === IS_DRAGGING_ELEMENT_TARGET.get(editor)
  const isDraggingOverLastBlock =
    isDragOver &&
    editor.children[editor.children.length - 1] ===
      IS_DRAGGING_ELEMENT_TARGET.get(editor)
  const dragPosition = IS_DRAGGING_BLOCK_TARGET_POSITION.get(editor)

  const isDraggingOverTop =
    isDraggingOverFirstBlock ||
    (isDragOver &&
      !isDraggingOverFirstBlock &&
      !isDraggingOverLastBlock &&
      dragPosition === 'top')
  const isDraggingOverBottom =
    isDraggingOverLastBlock ||
    (isDragOver &&
      !isDraggingOverFirstBlock &&
      !isDraggingOverLastBlock &&
      dragPosition === 'bottom')

  if (props.readOnly) {
    return {
      droppableProps: {
        onDragOver: undefined,
        onDragLeave: undefined,
        onDrop: undefined,
      },
      isDraggingOverTop: false,
      isDraggingOverBottom: false,
    }
  }

  return {
    droppableProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
    isDraggingOverTop,
    isDraggingOverBottom,
  }
}
