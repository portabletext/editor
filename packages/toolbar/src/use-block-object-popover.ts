import {
  useEditor,
  useEditorSelector,
  type BlockObjectSchemaType,
  type BlockPath,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback, useEffect, useState, type RefObject} from 'react'
import * as React from 'react'

/**
 * @beta
 */
export function useBlockObjectPopover() {
  const editor = useEditor()
  const schemaTypes = useEditorSelector(
    editor,
    (s) => s.context.schema.blockObjects,
  )
  const [state, setState] = useState<
    | {
        type: 'idle'
      }
    | {
        type: 'visible'
        object: {
          value: PortableTextObject
          schemaType: BlockObjectSchemaType
          at: BlockPath
        }
        elementRef: RefObject<Element | null>
      }
  >({type: 'idle'})

  useEffect(() => {
    return editor.on('selection', () => {
      const snapshot = editor.getSnapshot()

      if (!selectors.isSelectionCollapsed(snapshot)) {
        setState((state) => (state.type === 'visible' ? {type: 'idle'} : state))
        return
      }

      const focusBlockObject = selectors.getFocusBlockObject(snapshot)

      if (!focusBlockObject) {
        setState((state) => (state.type === 'visible' ? {type: 'idle'} : state))
        return
      }

      const schemaType = schemaTypes.find(
        (schemaType) => schemaType.name === focusBlockObject.node._type,
      )

      if (!schemaType) {
        setState((state) => (state.type === 'visible' ? {type: 'idle'} : state))
        return
      }

      const selectedNodes = editor.dom.getBlockNodes(snapshot)
      const firstSelectedNode = selectedNodes.at(0)

      if (!firstSelectedNode || !(firstSelectedNode instanceof Element)) {
        setState((state) => (state.type === 'visible' ? {type: 'idle'} : state))
        return
      }

      const elementRef = React.createRef<Element>()
      elementRef.current = firstSelectedNode

      setState({
        type: 'visible',
        object: {
          value: focusBlockObject.node,
          schemaType,
          at: focusBlockObject.path,
        },
        elementRef,
      })
    }).unsubscribe
  }, [editor, schemaTypes])

  const onRemove = useCallback(() => {
    if (state.type === 'visible') {
      editor.send({
        type: 'delete.block',
        at: state.object.at,
      })
      editor.send({type: 'focus'})
    }
  }, [editor, state])

  const onEdit = useCallback(
    ({props}: {props: {[key: string]: unknown}}) => {
      if (state.type === 'visible') {
        editor.send({
          type: 'block.set',
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
