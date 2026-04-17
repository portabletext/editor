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
import {isVoidNode} from '../../node/is-void-node'
import {pathEquals} from '../../path/path-equals'
import useChildren from '../hooks/use-children'
import {useDecorations} from '../hooks/use-decorations'
import {useSlateStatic} from '../hooks/use-slate-static'
import getDirection from '../utils/direction'
import type {RenderElementProps} from './editable'

const defaultRenderElement = (props: RenderElementProps) => (
  <DefaultElement {...props} />
)

/**
 * Element.
 */

const Element = (props: {
  decorations: DecoratedRange[]
  element: PortableTextTextBlock | PortableTextObject
  path: Path
  renderElement?: (props: RenderElementProps) => JSX.Element
}) => {
  const {
    decorations: parentDecorations,
    element,
    renderElement = defaultRenderElement,
  } = props
  const dataPath = serializePath(props.path)
  const editor = useSlateStatic()
  const isInline = isInlinePath(editor, props.path)
  const isVoid = isVoidNode(
    {
      schema: editor.schema,
      containers: editor.containers,
      value: editor.children,
    },
    element,
    props.path,
  )

  const decorations = useDecorations(element, props.path, parentDecorations)

  const regularChildren = useChildren({
    decorations,
    node: element,
    path: props.path,
    renderElement,
  })

  const attributes: {
    'data-pt-path': string
    'dir'?: 'rtl'
  } = {
    'data-pt-path': dataPath,
  }

  if (!isInline && isTextBlockNode({schema: editor.schema}, element)) {
    const text = getText(editor, props.path)
    const dir = text !== undefined ? getDirection(text) : undefined

    if (dir === 'rtl') {
      attributes.dir = dir
    }
  }

  const children = isVoid ? null : regularChildren

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
    pathEquals(prev.path, next.path) &&
    prev.renderElement === next.renderElement &&
    isElementDecorationsEqual(prev.decorations, next.decorations)
  )
})

/**
 * The default element renderer.
 */

const DefaultElement = (props: RenderElementProps) => {
  const {attributes, children} = props
  const editor = useSlateStatic()
  const Tag = isInlinePath(editor, props.path) ? 'span' : 'div'
  return (
    <Tag {...attributes} style={{position: 'relative'}}>
      {children}
    </Tag>
  )
}

export default MemoizedElement
