import React, {useCallback, useRef, type JSX} from 'react'
import {isTextDecorationsEqual} from '../../dom/utils/range-list'
import type {Element} from '../../interfaces/element'
import type {DecoratedRange, Text as SlateText} from '../../interfaces/text'
import {getTextDecorations} from '../../text/get-text-decorations'
import {useDecorations} from '../hooks/use-decorations'
import {useSlateStatic} from '../hooks/use-slate-static'
import {ReactEditor} from '../plugin/react-editor'
import type {
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderTextProps,
} from './editable'
import Leaf from './leaf'

const defaultRenderText = (props: RenderTextProps) => <DefaultText {...props} />

/**
 * Text.
 */

const Text = (props: {
  decorations: DecoratedRange[]
  isLast: boolean
  parent: Element
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  text: SlateText
}) => {
  const {
    decorations: parentDecorations,
    isLast,
    parent,
    renderPlaceholder,
    renderLeaf,
    renderText = defaultRenderText,
    text,
  } = props

  const editor = useSlateStatic()
  const ref = useRef<HTMLSpanElement | null>(null)
  const decorations = useDecorations(text, parentDecorations)
  const decoratedLeaves = getTextDecorations(text, decorations)
  const key = ReactEditor.findKey(editor, text)
  const children = []

  for (let i = 0; i < decoratedLeaves.length; i++) {
    const {leaf, position} = decoratedLeaves[i]!

    children.push(
      <Leaf
        isLast={isLast && i === decoratedLeaves.length - 1}
        key={`${key.id}-${i}`}
        renderPlaceholder={renderPlaceholder}
        leaf={leaf}
        leafPosition={position}
        text={text}
        parent={parent}
        renderLeaf={renderLeaf}
      />,
    )
  }

  // Update element-related editor maps with the DOM element ref.
  const callbackRef = useCallback(
    (span: HTMLSpanElement | null) => {
      if (span) {
        editor.keyToElement?.set(key, span)
        editor.nodeToElement.set(text, span)
        editor.elementToNode.set(span, text)
      } else {
        editor.keyToElement?.delete(key)
        editor.nodeToElement.delete(text)
        if (ref.current) {
          editor.elementToNode.delete(ref.current)
        }
      }
      ref.current = span
    },
    [ref, editor, key, text],
  )

  const attributes: {
    'data-slate-node': 'text'
    'ref': any
  } = {
    'data-slate-node': 'text',
    'ref': callbackRef,
  }

  return renderText({
    text,
    children,
    attributes,
  })
}

const MemoizedText = React.memo(Text, (prev, next) => {
  return (
    next.parent === prev.parent &&
    next.isLast === prev.isLast &&
    next.renderText === prev.renderText &&
    next.renderLeaf === prev.renderLeaf &&
    next.renderPlaceholder === prev.renderPlaceholder &&
    next.text === prev.text &&
    isTextDecorationsEqual(next.decorations, prev.decorations)
  )
})

export const DefaultText = (props: RenderTextProps) => {
  const {attributes, children} = props
  return <span {...attributes}>{children}</span>
}

export default MemoizedText
