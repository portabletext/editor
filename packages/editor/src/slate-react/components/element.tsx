import React, {useCallback, type JSX} from 'react'
import {ReactEditor, useSlateStatic} from '..'
import type {DecoratedRange, Element as SlateElement} from '../../slate'
import {isElementDecorationsEqual} from '../../slate-dom'
import {hasInlines} from '../../slate/editor/has-inlines'
import {getString} from '../../slate/node/get-string'
import useChildren from '../hooks/use-children'
import {useDecorations} from '../hooks/use-decorations'
import getDirection from '../utils/direction'
import type {
  RenderElementProps,
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderTextProps,
} from './editable'

const defaultRenderElement = (props: RenderElementProps) => (
  <DefaultElement {...props} />
)

/**
 * Element.
 */

const Element = (props: {
  decorations: DecoratedRange[]
  element: SlateElement
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
}) => {
  const {
    decorations: parentDecorations,
    element,
    renderElement = defaultRenderElement,
    renderPlaceholder,
    renderLeaf,
    renderText,
  } = props
  const editor = useSlateStatic()
  const isInline = editor.isInline(element)
  const decorations = useDecorations(element, parentDecorations)
  const key = ReactEditor.findKey(editor, element)
  const ref = useCallback(
    (ref: HTMLElement | null) => {
      // Update element-related editor maps with the DOM element ref.
      if (ref) {
        editor.keyToElement?.set(key, ref)
        editor.nodeToElement.set(element, ref)
        editor.elementToNode.set(ref, element)
      } else {
        editor.keyToElement?.delete(key)
        editor.nodeToElement.delete(element)
      }
    },
    [editor, key, element],
  )
  const children: React.ReactNode = useChildren({
    decorations,
    node: element,
    renderElement,
    renderPlaceholder,
    renderLeaf,
    renderText,
  })

  // Attributes that the developer must mix into the element in their
  // custom node renderer component.
  const attributes: {
    'data-slate-node': 'element'
    'data-slate-void'?: true
    'data-slate-inline'?: true
    'contentEditable'?: false
    'dir'?: 'rtl'
    'ref': any
  } = {
    'data-slate-node': 'element',
    ref,
  }

  if (isInline) {
    attributes['data-slate-inline'] = true
  }

  // If it's a block node with inline children, add the proper `dir` attribute
  // for text direction.
  if (!isInline && hasInlines(editor, element)) {
    const text = getString(element, editor.schema)
    const dir = getDirection(text)

    if (dir === 'rtl') {
      attributes.dir = dir
    }
  }

  return renderElement({attributes, children, element})
}

const MemoizedElement = React.memo(Element, (prev, next) => {
  return (
    prev.element === next.element &&
    prev.renderElement === next.renderElement &&
    prev.renderText === next.renderText &&
    prev.renderLeaf === next.renderLeaf &&
    prev.renderPlaceholder === next.renderPlaceholder &&
    isElementDecorationsEqual(prev.decorations, next.decorations)
  )
})

/**
 * The default element renderer.
 */

export const DefaultElement = (props: RenderElementProps) => {
  const {attributes, children, element} = props
  const editor = useSlateStatic()
  const Tag = editor.isInline(element) ? 'span' : 'div'
  return (
    <Tag {...attributes} style={{position: 'relative'}}>
      {children}
    </Tag>
  )
}

export default MemoizedElement
