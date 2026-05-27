import type {PortableTextObject} from '@portabletext/schema'
import React, {useContext, type JSX} from 'react'
import {NewPipelineContext} from '../../../editor/new-pipeline-context'
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
 *
 * Reads `NewPipelineContext` to decide between the new-pipeline shape
 * (`data-pt-*` only) and the legacy shape (`data-slate-*` mixed in for
 * backwards compatibility). The context is provided by `useChildren`
 * (wrapping each new-pipeline child) and by the dispatch sites in
 * `render.element.tsx` / `render.span.tsx`.
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
  const isInNewPipeline = useContext(NewPipelineContext)

  const attributes: RenderElementProps['attributes'] = isInNewPipeline
    ? {
        'data-pt-path': dataPath,
      }
    : {
        'data-slate-node': 'element',
        'data-slate-void': true,
        'data-pt-path': dataPath,
      }

  if (isInline && !readOnly) {
    attributes.contentEditable = false
  }

  const Tag = isInline ? 'span' : 'div'

  const children = isInNewPipeline ? (
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
