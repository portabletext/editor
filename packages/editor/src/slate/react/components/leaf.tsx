import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import React, {type JSX} from 'react'
import type {Path} from '../../interfaces/path'
import type {LeafPosition} from '../../interfaces/text'
import {textEquals} from '../../text/text-equals'
import type {RenderLeafProps} from './editable'
import SlateString from './string'

const defaultRenderLeaf = (props: RenderLeafProps) => <DefaultLeaf {...props} />

/**
 * Individual leaves in a text node with unique formatting.
 */
const Leaf = (props: {
  isLast: boolean
  leaf: PortableTextSpan
  parent: PortableTextTextBlock | PortableTextObject
  path: Path
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  text: PortableTextSpan
  leafPosition?: LeafPosition
}) => {
  const {
    leaf,
    isLast,
    text,
    path,
    parent,
    renderLeaf = defaultRenderLeaf,
    leafPosition,
  } = props

  const children = (
    <SlateString
      isLast={isLast}
      leaf={leaf}
      parent={parent}
      path={path}
      text={text}
    />
  )

  // COMPAT: Having the `data-` attributes on these leaf elements ensures that
  // in certain misbehaving browsers they aren't weirdly cloned/destroyed by
  // contenteditable behaviors. (2019/05/08)
  const attributes: {
    'data-slate-leaf': true
  } = {
    'data-slate-leaf': true,
  }

  return renderLeaf({
    attributes,
    children,
    leaf,
    text,
    path,
    leafPosition,
  })
}

const MemoizedLeaf = React.memo(Leaf, (prev, next) => {
  return (
    next.parent === prev.parent &&
    next.isLast === prev.isLast &&
    next.renderLeaf === prev.renderLeaf &&
    next.text === prev.text &&
    textEquals(next.leaf, prev.leaf)
  )
})

const DefaultLeaf = (props: RenderLeafProps) => {
  const {attributes, children} = props
  return <span {...attributes}>{children}</span>
}

export default MemoizedLeaf
