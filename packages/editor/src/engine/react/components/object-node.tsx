import type {PortableTextObject} from '@portabletext/schema'
import React, {type JSX} from 'react'
import {serializePath} from '../../../paths/serialize-path'
import {isElementDecorationsEqual} from '../../dom/utils/range-list'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {pathEquals} from '../../path/path-equals'
import {useReadOnly} from '../hooks/use-read-only'
import type {RenderElementProps} from './editable'

/**
 * Wrapper for block or inline object nodes that have no children in the engine
 * model. The DOM still needs a hidden zero-width text node for caret
 * anchoring, which is the spacer below.
 */
const ObjectNodeComponent = (props: {
  decorations: DecoratedRange[]
  isInline: boolean
  objectNode: PortableTextObject
  path: Path
  renderElement: (props: RenderElementProps) => JSX.Element
}) => {
  const {isInline, objectNode, path, renderElement} = props
  const dataPath = serializePath(path)
  const readOnly = useReadOnly()

  const attributes: RenderElementProps['attributes'] = {
    'data-pt-path': dataPath,
  }

  if (isInline && !readOnly) {
    attributes.contentEditable = false
  }

  const Tag = isInline ? 'span' : 'div'

  const children = (
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
