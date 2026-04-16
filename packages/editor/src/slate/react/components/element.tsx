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
import type {RenderElementProps, RenderPlaceholderProps} from './editable'

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
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
}) => {
  const {
    decorations: parentDecorations,
    element,
    renderElement = defaultRenderElement,
    renderPlaceholder,
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
    renderPlaceholder,
  })

  // Attributes that the developer must mix into the element in their
  // custom node renderer component.
  const attributes: {
    'data-slate-node': 'element'
    'data-slate-void'?: true
    'data-slate-inline'?: true
    'data-pt-path': string
    'contentEditable'?: false
    'dir'?: 'rtl'
  } = {
    'data-slate-node': 'element',
    'data-pt-path': dataPath,
  }

  if (isInline) {
    attributes['data-slate-inline'] = true
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
    pathEquals(prev.path, next.path) &&
    prev.renderElement === next.renderElement &&
    prev.renderPlaceholder === next.renderPlaceholder &&
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
