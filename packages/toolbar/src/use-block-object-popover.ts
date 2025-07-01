import {
  useEditor,
  type BlockPath,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import * as React from 'react'
import {useCallback, useEffect, useState, type RefObject} from 'react'
import type {ToolbarBlockObjectDefinition} from './toolbar-schema-definition'

/**
 * @beta
 */
export function useBlockObjectPopover(props: {
  definitions: ReadonlyArray<ToolbarBlockObjectDefinition>
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
          definition: ToolbarBlockObjectDefinition
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

      const definition = props.definitions.find(
        (definition) => definition.name === focusBlockObject.node._type,
      )

      if (!definition) {
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
          definition,
          at: focusBlockObject.path,
        },
        elementRef,
      })
    }).unsubscribe
  }, [editor, props.definitions])

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
