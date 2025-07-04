import {
  useEditor,
  type ChildPath,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import * as React from 'react'
import {useCallback, useEffect, useState, type RefObject} from 'react'
import type {ToolbarInlineObjectDefinition} from './toolbar-schema-definition'

/**
 * @beta
 */
export function useInlineObjectPopover(props: {
  definitions: ReadonlyArray<ToolbarInlineObjectDefinition>
}) {
  const editor = useEditor()

  const [state, setState] = useState<
    | {
        type: 'idle'
      }
    | {
        type: 'visible'
        object: {
          value: PortableTextObject
          definition: ToolbarInlineObjectDefinition
          at: ChildPath
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

      const focusInlineObject = selectors.getFocusInlineObject(snapshot)

      if (!focusInlineObject) {
        setState((state) => (state.type === 'visible' ? {type: 'idle'} : state))
        return
      }

      const definition = props.definitions.find(
        (schemaType) => schemaType.name === focusInlineObject.node._type,
      )

      if (!definition) {
        setState((state) => (state.type === 'visible' ? {type: 'idle'} : state))
        return
      }

      const selectedNodes = editor.dom.getChildNodes(snapshot)
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
          value: focusInlineObject.node,
          definition,
          at: focusInlineObject.path,
        },
        elementRef,
      })
    }).unsubscribe
  }, [editor, props.definitions])

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
