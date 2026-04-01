import type {
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import React, {type JSX} from 'react'
import {isTextDecorationsEqual} from '../slate/dom/utils/range-list'
import type {Path} from '../slate/interfaces/path'
import type {DecoratedRange} from '../slate/interfaces/text'
import {pathEquals} from '../slate/path/path-equals'
import {useDecorations} from '../slate/react/hooks/use-decorations'
import {getTextDecorations} from '../slate/text/get-text-decorations'
import type {
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderTextProps,
} from './render.internal-editable'
import Leaf from './render.internal-leaf'

const defaultRenderText = (props: RenderTextProps) => <DefaultText {...props} />

/**
 * Text.
 */

const Text = (props: {
  dataPath: string
  decorations: DecoratedRange[]
  isLast: boolean
  parent: PortableTextTextBlock
  indexedPath: Path
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  text: PortableTextSpan
}) => {
  const {
    dataPath,
    decorations: parentDecorations,
    isLast,
    parent,
    indexedPath,
    renderPlaceholder,
    renderLeaf,
    renderText = defaultRenderText,
    text,
  } = props

  const decorations = useDecorations(text, indexedPath, parentDecorations)
  const decoratedLeaves = getTextDecorations(text, decorations)
  const children = []

  for (let i = 0; i < decoratedLeaves.length; i++) {
    const {leaf, position} = decoratedLeaves[i]!

    children.push(
      <Leaf
        isLast={isLast && i === decoratedLeaves.length - 1}
        key={`${text._key}-${i}`}
        renderPlaceholder={renderPlaceholder}
        leaf={leaf}
        leafPosition={position}
        text={text}
        indexedPath={indexedPath}
        parent={parent}
        renderLeaf={renderLeaf}
      />,
    )
  }

  const attributes: {
    'data-slate-node': 'text'
    'data-pt-path': string
  } = {
    'data-slate-node': 'text',
    'data-pt-path': dataPath,
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
    pathEquals(next.indexedPath, prev.indexedPath) &&
    next.renderText === prev.renderText &&
    next.renderLeaf === prev.renderLeaf &&
    next.renderPlaceholder === prev.renderPlaceholder &&
    next.text === prev.text &&
    isTextDecorationsEqual(next.decorations, prev.decorations)
  )
})

const DefaultText = (props: RenderTextProps) => {
  const {attributes, children} = props
  return <span {...attributes}>{children}</span>
}

export default MemoizedText
