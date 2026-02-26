import React, {useCallback, type JSX} from 'react'
import {ReactEditor, useReadOnly, useSlateStatic} from '..'
import {
  Editor,
  Node,
  type DecoratedRange,
  type Element as SlateElement,
} from '../../slate'
import {isElementDecorationsEqual} from '../../slate-dom'
import useChildren from '../hooks/use-children'
import {useDecorations} from '../hooks/use-decorations'
import getDirection from '../utils/direction'
import type {
  RenderChunkProps,
  RenderElementProps,
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderTextProps,
} from './editable'
import Text from './text'

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
  renderChunk?: (props: RenderChunkProps) => JSX.Element
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
}) => {
  const {
    decorations: parentDecorations,
    element,
    renderElement = defaultRenderElement,
    renderChunk,
    renderPlaceholder,
    renderLeaf,
    renderText,
  } = props
  const editor = useSlateStatic()
  const readOnly = useReadOnly()
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
  let children: React.ReactNode = useChildren({
    decorations,
    node: element,
    renderElement,
    renderChunk,
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
  if (!isInline && Editor.hasInlines(editor, element)) {
    const text = Node.string(element)
    const dir = getDirection(text)

    if (dir === 'rtl') {
      attributes.dir = dir
    }
  }

  // If it's a void node, wrap the children in extra void-specific elements.
  if (Editor.isVoid(editor, element)) {
    attributes['data-slate-void'] = true

    if (!readOnly && isInline) {
      attributes.contentEditable = false
    }

    const Tag = isInline ? 'span' : 'div'
    const [textEntry] = Node.texts(element)
    const [text] = textEntry!

    children = (
      <Tag
        data-slate-spacer
        style={{
          height: '0',
          color: 'transparent',
          outline: 'none',
          position: 'absolute',
        }}
      >
        <Text
          renderPlaceholder={renderPlaceholder}
          decorations={[]}
          isLast={false}
          parent={element}
          text={text}
        />
      </Tag>
    )

    editor.nodeToIndex.set(text, 0)
    editor.nodeToParent.set(text, element)
  }

  return renderElement({attributes, children, element})
}

const MemoizedElement = React.memo(Element, (prev, next) => {
  return (
    prev.element === next.element &&
    prev.renderElement === next.renderElement &&
    prev.renderChunk === next.renderChunk &&
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
