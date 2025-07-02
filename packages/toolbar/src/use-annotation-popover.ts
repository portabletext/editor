import {
  useEditor,
  type AnnotationPath,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import * as React from 'react'
import {useCallback, useEffect, useState, type RefObject} from 'react'
import type {ToolbarAnnotationDefinition} from './toolbar-schema-definition'

/**
 * @beta
 */
export function useAnnotationPopover(props: {
  definitions: ReadonlyArray<ToolbarAnnotationDefinition>
}) {
  const editor = useEditor()
  const [state, setState] = useState<
    | {
        type: 'idle'
      }
    | {
        type: 'visible'
        annotations: Array<{
          value: PortableTextObject
          definition: ToolbarAnnotationDefinition
          at: AnnotationPath
        }>
        elementRef: RefObject<Element | null>
      }
  >({type: 'idle'})

  useEffect(() => {
    return editor.on('*', () => {
      const snapshot = editor.getSnapshot()
      const activeAnnotations = selectors.getActiveAnnotations(snapshot)
      const focusBlock = selectors.getFocusBlock(snapshot)

      if (activeAnnotations.length === 0 || !focusBlock) {
        setState((state) => (state.type === 'visible' ? {type: 'idle'} : state))
        return
      }

      const selectedChildren = editor.dom.getChildNodes(snapshot)
      const firstSelectedChild = selectedChildren.at(0)

      if (!firstSelectedChild || !(firstSelectedChild instanceof Element)) {
        setState((state) => (state.type === 'visible' ? {type: 'idle'} : state))
        return
      }

      const elementRef = React.createRef<Element>()
      elementRef.current = firstSelectedChild

      setState({
        type: 'visible',
        annotations: activeAnnotations.flatMap((annotation) => {
          const definition = props.definitions.find(
            (definition) => definition.name === annotation._type,
          )

          if (!definition) {
            return []
          }

          return {
            value: annotation,
            definition,
            at: [
              {_key: focusBlock.node._key},
              'markDefs',
              {_key: annotation._key},
            ],
          }
        }),
        elementRef,
      })
    }).unsubscribe
  }, [editor, props.definitions])

  const onRemove = useCallback(
    (annotation: {definition: ToolbarAnnotationDefinition}) => {
      if (state.type === 'visible') {
        editor.send({
          type: 'annotation.remove',
          annotation: {
            name: annotation.definition.name,
          },
        })
        editor.send({type: 'focus'})
      }
    },
    [editor, state],
  )

  const onEdit = useCallback(
    (annotation: {at: AnnotationPath; props: {[key: string]: unknown}}) => {
      if (state.type === 'visible') {
        editor.send({
          type: 'annotation.set',
          at: annotation.at,
          props: annotation.props,
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

  return {state, onRemove, onEdit, onClose}
}
