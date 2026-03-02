import React, {useCallback, type JSX} from 'react'
import {ReactEditor, useSlateStatic} from '..'
import type {DecoratedRange, Element as SlateElement} from '../../slate'
import {IS_ANDROID, isElementDecorationsEqual} from '../../slate-dom'
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
 * through the renderElement callback.
 *
 * Although ObjectNodes have no children in the Slate model, the DOM must
 * contain a hidden spacer with a zero-width text node for selection anchoring.
 * This mirrors the old void-child rendering - same DOM, different model.
 */

const ObjectNodeComponent = (props: {
  decorations: DecoratedRange[]
  objectNode: ObjectNode
  isInline: boolean
  renderElement?: (props: RenderElementProps) => JSX.Element
}) => {
  const {objectNode, isInline, renderElement = defaultRenderElement} = props
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

  // Create a stable virtual text node for the spacer.
  // This is registered in Slate's node maps so that DOMEditor.findPath
  // can resolve the spacer to a path, which keeps the browser from
  // normalizing the selection away from the spacer.
  // Virtual text node for the spacer - cast to any to satisfy WeakMap<Node, ...> types.
  // This object is only used as a map key for DOM-to-Slate resolution.
  const virtualTextNode = React.useMemo(() => ({text: ''}) as any, [])

  const spacerTextRef = useCallback(
    (ref: HTMLElement | null) => {
      if (ref) {
        editor.elementToNode.set(ref, virtualTextNode)
        editor.nodeToElement.set(virtualTextNode, ref)
        editor.nodeToIndex.set(virtualTextNode, 0)
        editor.nodeToParent.set(virtualTextNode, objectNode)
      } else {
        editor.nodeToIndex.delete(virtualTextNode)
        editor.nodeToParent.delete(virtualTextNode)
        editor.nodeToElement.delete(virtualTextNode)
      }
    },
    [editor, objectNode, virtualTextNode],
  )

  const attributes: RenderElementProps['attributes'] = {
    'data-slate-node': 'element',
    'data-slate-void': true,
    ref,
  }

  if (isInline) {
    attributes['data-slate-inline'] = true
  }

  const Tag = isInline ? 'span' : 'div'

  // Render a hidden spacer that mirrors the old void-child DOM structure.
  // The spacer provides a text node for DOM selection anchoring without
  // requiring a real Slate text node in the model.
  const children = (
    <Tag
      data-slate-spacer
      style={{
        height: '0',
        color: 'transparent',
        outline: 'none',
        position: 'absolute',
      }}
    >
      <span data-slate-node="text" ref={spacerTextRef}>
        <span data-slate-leaf>
          <span data-slate-zero-width="z" data-slate-length={0}>
            {!IS_ANDROID ? '\uFEFF' : null}
          </span>
        </span>
      </span>
    </Tag>
  )

  return renderElement({
    attributes,
    children,
    element: objectNode as unknown as SlateElement,
  })
}

const MemoizedObjectNode = React.memo(ObjectNodeComponent, (prev, next) => {
  return (
    prev.objectNode === next.objectNode &&
    prev.renderElement === next.renderElement &&
    prev.isInline === next.isInline &&
    isElementDecorationsEqual(prev.decorations, next.decorations)
  )
})

export default MemoizedObjectNode
