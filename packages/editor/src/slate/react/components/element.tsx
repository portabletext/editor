import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import React, {type JSX} from 'react'
import {getText} from '../../../node-traversal/get-text'
import {isInline as isInlinePath} from '../../../node-traversal/is-inline'
import {serializePath} from '../../../paths/serialize-path'
import {isElementDecorationsEqual} from '../../dom/utils/range-list'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {isTextBlockNode} from '../../node/is-text-block-node'
import {pathEquals} from '../../path/path-equals'
import useChildren from '../hooks/use-children'
import {useDecorations} from '../hooks/use-decorations'
import {useSlateStatic} from '../hooks/use-slate-static'
import getDirection from '../utils/direction'
import type {
  RenderElementProps,
  RenderLeafProps,
  RenderTextProps,
} from './editable'

/**
 * Element wrapper. Receives a node that already has children (a text block
 * or an editable container) and threads decorations + children through the
 * `renderElement` callback.
 *
 * The `isContainer` flag is resolved by `useChildren` at dispatch time and
 * passed in to avoid a second `isEditableContainer` walk here.
 */
const Element = (props: {
  decorations: DecoratedRange[]
  element: PortableTextTextBlock | PortableTextObject
  isContainer: boolean
  path: Path
  renderElement: (props: RenderElementProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
}) => {
  const {
    decorations: parentDecorations,
    element,
    isContainer,
    renderElement,
    renderLeaf,
    renderText,
  } = props
  const dataPath = serializePath(props.path)
  const editor = useSlateStatic()
  const isInline = isInlinePath(editor, props.path)
  const decorations = useDecorations(element, props.path, parentDecorations)
  const children = useChildren({
    decorations,
    node: element,
    path: props.path,
    renderElement,
    renderLeaf,
    renderText,
  })

  // Attributes that the developer must mix into the element in their
  // custom node renderer component.
  const attributes: RenderElementProps['attributes'] = isContainer
    ? {
        'data-pt-block': 'container',
        'data-pt-path': dataPath,
      }
    : {
        'data-slate-node': 'element',
        'data-pt-path': dataPath,
      }

  // If it's a block node with inline children, add the proper `dir` attribute
  // for text direction.
  if (!isInline && isTextBlockNode({schema: editor.schema}, element)) {
    const text = getText(editor, props.path)
    const dir = text !== undefined ? getDirection(text) : undefined

    if (dir === 'rtl') {
      attributes.dir = dir
    }
  }

  return renderElement({
    attributes,
    children,
    element,
    path: props.path,
  })
}

const MemoizedElement = React.memo(Element, (prev, next) => {
  return (
    prev.element === next.element &&
    prev.isContainer === next.isContainer &&
    pathEquals(prev.path, next.path) &&
    prev.renderElement === next.renderElement &&
    prev.renderText === next.renderText &&
    prev.renderLeaf === next.renderLeaf &&
    isElementDecorationsEqual(prev.decorations, next.decorations)
  )
})

export default MemoizedElement
