import type {PortableTextObject} from '@portabletext/schema'
import React, {type JSX} from 'react'
import {IS_ANDROID} from '../../dom/utils/environment'
import {isElementDecorationsEqual} from '../../dom/utils/range-list'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {pathEquals} from '../../path/path-equals'
import {useReadOnly} from '../hooks/use-read-only'
import type {RenderElementProps} from './editable'

const defaultRenderElement = (props: RenderElementProps) => {
  const {attributes, children} = props
  return (
    <div {...attributes} style={{position: 'relative'}}>
      {children}
    </div>
  )
}

/**
 * ObjectNode component. Renders an ObjectNode (block object or inline object)
 * through the renderElement callback.
 *
 * Although ObjectNodes have no children in the Slate model, the DOM must
 * contain a hidden spacer with a zero-width text node for selection anchoring.
 */
const ObjectNodeComponent = (props: {
  dataPath: string
  decorations: DecoratedRange[]
  objectNode: PortableTextObject
  isInline: boolean
  indexedPath: Path
  renderElement?: (props: RenderElementProps) => JSX.Element
}) => {
  const {
    dataPath,
    objectNode,
    isInline,
    indexedPath,
    renderElement = defaultRenderElement,
  } = props
  const readOnly = useReadOnly()

  const attributes: RenderElementProps['attributes'] = {
    'data-slate-node': 'element',
    'data-slate-void': true,
    'data-path': dataPath,
  }

  if (isInline) {
    attributes['data-slate-inline'] = true

    if (!readOnly) {
      attributes.contentEditable = false
    }
  }

  const Tag = isInline ? 'span' : 'div'

  const children = (
    <Tag
      data-slate-spacer
      style={{
        height: '0',
        color: 'transparent',
        outline: 'none',
        position: 'absolute',
      }}
    >
      <span data-slate-node="text">
        <span data-slate-leaf>
          <span data-slate-zero-width="z" data-slate-length={0}>
            {!IS_ANDROID ? '\uFEFF' : null}
          </span>
        </span>
      </span>
    </Tag>
  )

  return renderElement({
    attributes,
    children,
    element: objectNode,
    indexedPath,
  })
}

const MemoizedObjectNode = React.memo(ObjectNodeComponent, (prev, next) => {
  return (
    prev.dataPath === next.dataPath &&
    prev.objectNode === next.objectNode &&
    pathEquals(prev.indexedPath, next.indexedPath) &&
    prev.renderElement === next.renderElement &&
    prev.isInline === next.isInline &&
    isElementDecorationsEqual(prev.decorations, next.decorations)
  )
})

export default MemoizedObjectNode
