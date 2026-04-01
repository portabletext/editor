import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import React, {type JSX} from 'react'
import {getText} from '../node-traversal/get-text'
import {isInline as isInlinePath} from '../node-traversal/is-inline'
import {isElementDecorationsEqual} from '../slate/dom/utils/range-list'
import type {Path} from '../slate/interfaces/path'
import type {DecoratedRange} from '../slate/interfaces/text'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {pathEquals} from '../slate/path/path-equals'
import useChildren from '../slate/react/hooks/use-children'
import {useDecorations} from '../slate/react/hooks/use-decorations'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import getDirection from '../slate/react/utils/direction'
import type {
  RenderElementProps,
  RenderLeafProps,
  RenderPlaceholderProps,
  RenderTextProps,
} from './render.internal-editable'

const defaultRenderElement = (props: RenderElementProps) => (
  <DefaultElement {...props} />
)

/**
 * Element.
 */

const Element = (props: {
  dataPath: string
  decorations: DecoratedRange[]
  element: PortableTextTextBlock | PortableTextObject
  indexedPath: Path
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderPlaceholder: (props: RenderPlaceholderProps) => JSX.Element
  renderText?: (props: RenderTextProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
}) => {
  const {
    dataPath,
    decorations: parentDecorations,
    element,
    renderElement = defaultRenderElement,
    renderPlaceholder,
    renderLeaf,
    renderText,
  } = props
  const editor = useSlateStatic()
  const isInline = isInlinePath(editor, props.indexedPath)
  const decorations = useDecorations(
    element,
    props.indexedPath,
    parentDecorations,
  )
  const children: React.ReactNode = useChildren({
    parentDataPath: dataPath,
    decorations,
    node: element,
    indexedPath: props.indexedPath,
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
    const text = getText(editor, props.indexedPath)
    const dir = text !== undefined ? getDirection(text) : undefined

    if (dir === 'rtl') {
      attributes.dir = dir
    }
  }

  return renderElement({
    attributes,
    children,
    element,
    indexedPath: props.indexedPath,
  })
}

const MemoizedElement = React.memo(Element, (prev, next) => {
  return (
    prev.dataPath === next.dataPath &&
    prev.element === next.element &&
    pathEquals(prev.indexedPath, next.indexedPath) &&
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

const DefaultElement = (props: RenderElementProps) => {
  const {attributes, children} = props
  const editor = useSlateStatic()
  const Tag = isInlinePath(editor, props.indexedPath) ? 'span' : 'div'
  return (
    <Tag {...attributes} style={{position: 'relative'}}>
      {children}
    </Tag>
  )
}

export default MemoizedElement
