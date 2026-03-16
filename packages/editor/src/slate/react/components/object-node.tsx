import React, {useCallback, useMemo, type JSX} from 'react'
import {IS_ANDROID} from '../../dom/utils/environment'
import {isElementDecorationsEqual} from '../../dom/utils/range-list'
import type {ObjectNode} from '../../interfaces/node'
import type {DecoratedRange} from '../../interfaces/text'
import {useReadOnly} from '../hooks/use-read-only'
import {useSlateStatic} from '../hooks/use-slate-static'
import {ReactEditor} from '../plugin/react-editor'
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
 * The spacer renders the same DOM structure as the old void children but
 * bypasses the Text component entirely (no useDecorations, no findPath on
 * synthetic nodes). Map registration is done directly.
 */

const ObjectNodeComponent = (props: {
  decorations: DecoratedRange[]
  objectNode: ObjectNode
  isInline: boolean
  renderElement?: (props: RenderElementProps) => JSX.Element
}) => {
  const {objectNode, isInline, renderElement = defaultRenderElement} = props
  const editor = useSlateStatic()
  const readOnly = useReadOnly()
  const key = ReactEditor.findKey(editor, objectNode)
  const ref = useCallback(
    (ref: HTMLElement | null) => {
      if (ref) {
        editor.keyToElement?.set(key, ref)
        editor.nodeToElement.set(objectNode, ref)
        editor.elementToNode.set(ref, objectNode)
      } else {
        editor.keyToElement?.delete(key)
        editor.nodeToElement.delete(objectNode)
      }
    },
    [editor, key, objectNode],
  )

  const syntheticText = useMemo(
    () => ({text: '', marks: []}) as Record<string, unknown>,
    [],
  )

  const spacerTextRef = useCallback(
    (span: HTMLSpanElement | null) => {
      if (span) {
        editor.keyToElement?.set(
          ReactEditor.findKey(editor, syntheticText as any),
          span,
        )
        editor.nodeToElement.set(syntheticText as any, span)
        editor.elementToNode.set(span, syntheticText as any)
      } else {
        editor.nodeToElement.delete(syntheticText as any)
      }
    },
    [editor, syntheticText],
  )

  React.useEffect(() => {
    editor.nodeToIndex.set(syntheticText as any, 0)
    editor.nodeToParent.set(syntheticText as any, objectNode)
    return () => {
      editor.nodeToIndex.delete(syntheticText as any)
      editor.nodeToParent.delete(syntheticText as any)
    }
  }, [editor, syntheticText, objectNode])

  const attributes: RenderElementProps['attributes'] = {
    'data-slate-node': 'element',
    'data-slate-void': true,
    ref,
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
      <span data-slate-node="text" ref={spacerTextRef}>
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
    element:
      objectNode as unknown as import('../../interfaces/element').Element,
  })
}

const MemoizedObjectNode = React.memo(ObjectNodeComponent, (prev, next) => {
  return (
    prev.objectNode === next.objectNode &&
    prev.renderElement === next.renderElement &&
    prev.isInline === next.isInline &&
    isElementDecorationsEqual(prev.decorations, next.decorations)
  )
})

export default MemoizedObjectNode
