import type {PortableTextObject} from '@portabletext/schema'
import React, {type JSX} from 'react'
import {serializePath} from '../../../paths/serialize-path'
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
  decorations: DecoratedRange[]
  objectNode: PortableTextObject
  isInline: boolean
  path: Path
  renderElement?: (props: RenderElementProps) => JSX.Element
}) => {
  const {
    objectNode,
    isInline,
    path,
    renderElement = defaultRenderElement,
  } = props
  const dataPath = serializePath(path)
  const readOnly = useReadOnly()

  const attributes: RenderElementProps['attributes'] = {
    'data-slate-node': 'element',
    'data-slate-void': true,
    'data-pt-path': dataPath,
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
          <span data-slate-zero-width="z">{!IS_ANDROID ? '\uFEFF' : null}</span>
        </span>
      </span>
    </Tag>
  )

  return renderElement({
    attributes,
    children,
    element: objectNode,
    path,
  })
}

const MemoizedObjectNode = React.memo(ObjectNodeComponent, (prev, next) => {
  return (
    prev.objectNode === next.objectNode &&
    pathEquals(prev.path, next.path) &&
    prev.renderElement === next.renderElement &&
    prev.isInline === next.isInline &&
    isElementDecorationsEqual(prev.decorations, next.decorations)
  )
})

export default MemoizedObjectNode
