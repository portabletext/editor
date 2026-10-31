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
import {useCompositionHold} from '../hooks/use-composition-hold'
import {useDecorations} from '../hooks/use-decorations'
import type {RenderLeafProps, RenderTextProps} from './editable'
import Leaf from './leaf'
import {
  RestoreDOMBoundary,
  SPIKE_RESTORE_DOM_BOUNDARY,
} from './restore-dom/restore-dom'

const defaultRenderText = (props: RenderTextProps) => <DefaultText {...props} />

/**
 * Text.
 */

const Text = (props: {
  decorations: DecoratedRange[]
  isLast: boolean
  parent: PortableTextTextBlock
  path: Path
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  text: PortableTextSpan
}) => {
  const {
    decorations: parentDecorations,
    isLast,
    parent,
    path,
    renderLeaf,
    renderText = defaultRenderText,
    text,
  } = props

  const {decorations, composingLeaf} = useCompositionHold(
    text,
    path,
    useDecorations(text, path, parentDecorations),
  )
  const decoratedLeaves = getTextDecorations(text, decorations)
  const children = []

  for (let i = 0; i < decoratedLeaves.length; i++) {
    const {leaf, position} = decoratedLeaves[i]!

    children.push(
      <Leaf
        isLast={isLast && i === decoratedLeaves.length - 1}
        key={leafKey(text._key, i, position, composingLeaf)}
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
    'data-pt-path': string
  } = {
    'data-pt-path': dataPath,
  }

  const rendered = renderText({
    text,
    children,
    attributes,
  })

  return SPIKE_RESTORE_DOM_BOUNDARY ? (
    <RestoreDOMBoundary>{rendered}</RestoreDOMBoundary>
  ) : (
    rendered
  )
}

// SPIKE ONLY: the leaf the IME composes in keeps the key it had when the
// composition started, so a leaf added before it does not remount it.
function leafKey(
  textKey: string,
  index: number,
  position: {start: number; end: number} | undefined,
  composingLeaf: {start: number; end: number; index: number} | null,
): string {
  if (!composingLeaf) {
    return `${textKey}-${index}`
  }
  const start = position?.start ?? 0
  if (start === composingLeaf.start) {
    return `${textKey}-${composingLeaf.index}`
  }
  return index === composingLeaf.index
    ? `${textKey}-${index}-beside-composing`
    : `${textKey}-${index}`
}

const MemoizedText = React.memo(Text, (prev, next) => {
  return (
    next.parent === prev.parent &&
    next.isLast === prev.isLast &&
    pathEquals(next.path, prev.path) &&
    next.renderText === prev.renderText &&
    next.renderLeaf === prev.renderLeaf &&
    next.text === prev.text &&
    isTextDecorationsEqual(next.decorations, prev.decorations)
  )
})

const DefaultText = (props: RenderTextProps) => {
  const {attributes, children} = props
  return <span {...attributes}>{children}</span>
}

export default MemoizedText
