import type {
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import React, {type JSX} from 'react'
import {serializePath} from '../../../paths/serialize-path'
import {isTextDecorationsEqual} from '../../dom/utils/range-list'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {pathEquals} from '../../path/path-equals'
import {getTextDecorations} from '../../text/get-text-decorations'
import {useDecorations} from '../hooks/use-decorations'
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
  parent: PortableTextTextBlock
  path: Path
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  text: PortableTextSpan
}) => {
  const {
    decorations: parentDecorations,
    isLast,
    parent,
    path,
    renderPlaceholder,
    renderLeaf,
    renderText = defaultRenderText,
    text,
  } = props

  const decorations = useDecorations(text, path, parentDecorations)
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
        path={path}
        parent={parent}
        renderLeaf={renderLeaf}
      />,
    )
  }

  const dataPath = serializePath(path)

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
    pathEquals(next.path, prev.path) &&
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
