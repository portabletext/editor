import {
  useEditor,
  useEditorSelector,
  type ChildPath,
  type InlineObjectSchemaType,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback, useEffect, useState, type RefObject} from 'react'
import * as React from 'react'

/**
 * @beta
 */
export function useInlineObjectPopover() {
  const editor = useEditor()
  const schemaTypes = useEditorSelector(
    editor,
    (s) => s.context.schema.inlineObjects,
  )

  const [state, setState] = useState<
    | {
        type: 'idle'
      }
    | {
        type: 'visible'
        object: {
          value: PortableTextObject
          schemaType: InlineObjectSchemaType
          at: ChildPath
        }
        elementRef: RefObject<Element | null>
      }
  >({type: 'idle'})

  useEffect(() => {
    return editor.on('selection', () => {
      const snapshot = editor.getSnapshot()

      if (!selectors.isSelectionCollapsed(snapshot)) {
        setState({type: 'idle'})
        return
      }

      const focusInlineObject = selectors.getFocusInlineObject(snapshot)

      if (!focusInlineObject) {
        setState({type: 'idle'})
        return
      }

      const schemaType = schemaTypes.find(
        (schemaType) => schemaType.name === focusInlineObject.node._type,
      )

      if (!schemaType) {
        setState({type: 'idle'})
        return
      }

      const selectedNodes = editor.dom.getChildNodes(snapshot)
      const firstSelectedNode = selectedNodes.at(0)

      if (!firstSelectedNode || !(firstSelectedNode instanceof Element)) {
        setState({type: 'idle'})
        return
      }

      const elementRef = React.createRef<Element>()
      elementRef.current = firstSelectedNode

      setState({
        type: 'visible',
        object: {
          value: focusInlineObject.node,
          schemaType,
          at: focusInlineObject.path,
        },
        elementRef,
      })
    }).unsubscribe
  }, [editor, schemaTypes])

  const onRemove = useCallback(() => {
    if (state.type === 'visible') {
      editor.send({
        type: 'delete.child',
        at: state.object.at,
      })
      editor.send({type: 'focus'})
    }
  }, [editor, state])

  const onEdit = useCallback(
    ({props}: {props: {[key: string]: unknown}}) => {
      if (state.type === 'visible') {
        editor.send({
          type: 'child.set',
          at: state.object.at,
          props,
        })
        editor.send({type: 'focus'})
      }
    },
    [editor, state],
  )

  const onClose = useCallback(() => {
    setState({type: 'idle'})
    editor.send({type: 'focus'})
  }, [editor, setState])

  return {
    state,
    onRemove,
    onEdit,
    onClose,
  }
}
