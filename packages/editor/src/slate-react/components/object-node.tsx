import React, {useCallback, type JSX} from 'react'
import {ReactEditor, useSlateStatic} from '..'
import type {DecoratedRange, Element as SlateElement} from '../../slate'
import {isElementDecorationsEqual} from '../../slate-dom'
import type {ObjectNode} from '../../slate/interfaces/node'
import type {RenderElementProps} from './editable'

const defaultRenderElement = (props: RenderElementProps) => {
  const {attributes, children} = props
  return (
    <div {...attributes} style={{position: 'relative'}}>
      {children}
    </div>
  )
}

/**
 * ObjectNode component. Renders an ObjectNode (block object or inline object)
 * through the renderElement callback. ObjectNodes have no children, so this
 * component does not call useChildren.
 */

const ObjectNodeComponent = (props: {
  decorations: DecoratedRange[]
  objectNode: ObjectNode
  renderElement?: (props: RenderElementProps) => JSX.Element
}) => {
  const {objectNode, renderElement = defaultRenderElement} = props
  const editor = useSlateStatic()
  const key = ReactEditor.findKey(editor, objectNode)
  const ref = useCallback(
    (ref: HTMLElement | null) => {
      if (ref) {
        editor.keyToElement?.set(key, ref)
        editor.nodeToElement.set(objectNode, ref)
        editor.elementToNode.set(ref, objectNode)
      } else {
        editor.keyToElement?.delete(key)
        editor.nodeToElement.delete(objectNode)
      }
    },
    [editor, key, objectNode],
  )

  const attributes: RenderElementProps['attributes'] = {
    'data-slate-node': 'element',
    ref,
  }

  // ObjectNodes have no children to render
  return renderElement({
    attributes,
    children: null,
    // Cast ObjectNode to Element for the renderElement callback.
    // The PTE render layer handles both Elements and ObjectNodes.
    element: objectNode as unknown as SlateElement,
  })
}

const MemoizedObjectNode = React.memo(ObjectNodeComponent, (prev, next) => {
  return (
    prev.objectNode === next.objectNode &&
    prev.renderElement === next.renderElement &&
    isElementDecorationsEqual(prev.decorations, next.decorations)
  )
})

export default MemoizedObjectNode
