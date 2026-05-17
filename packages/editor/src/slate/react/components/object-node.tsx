import type {PortableTextObject} from '@portabletext/schema'
import React, {useContext, type JSX} from 'react'
import {ParentContainerContext} from '../../../editor/parent-container-context'
import {serializePath} from '../../../paths/serialize-path'
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
  const parentContainer = useContext(ParentContainerContext)

  const attributes: RenderElementProps['attributes'] = parentContainer
    ? {
        'data-pt-path': dataPath,
      }
    : {
        'data-slate-node': 'element',
        'data-slate-void': true,
        'data-pt-path': dataPath,
      }

  if (isInline) {
    if (!readOnly) {
      attributes.contentEditable = false
    }
  }

  const Tag = isInline ? 'span' : 'div'

  const children = parentContainer ? (
    <Tag
      data-pt-spacer
      style={{
        height: '0',
        color: 'transparent',
        outline: 'none',
        position: 'absolute',
      }}
    >
      <span>
        <span data-pt-marks>
          <span data-pt-zero-width>{'\uFEFF'}</span>
        </span>
      </span>
    </Tag>
  ) : (
    <Tag
      data-slate-spacer
      data-pt-spacer
      style={{
        height: '0',
        color: 'transparent',
        outline: 'none',
        position: 'absolute',
      }}
    >
      <span data-slate-node="text">
        <span data-slate-leaf data-pt-marks>
          <span data-slate-zero-width="z" data-pt-zero-width>
            {'\uFEFF'}
          </span>
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
