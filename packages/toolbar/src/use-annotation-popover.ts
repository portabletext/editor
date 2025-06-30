import {
  useEditor,
  useEditorSelector,
  type AnnotationPath,
  type AnnotationSchemaType,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback, useEffect, useState, type RefObject} from 'react'
import * as React from 'react'

/**
 * @beta
 */
export function useAnnotationPopover() {
  const editor = useEditor()
  const schemaTypes = useEditorSelector(
    editor,
    (s) => s.context.schema.annotations,
  )
  const [state, setState] = useState<
    | {
        type: 'idle'
      }
    | {
        type: 'visible'
        annotations: Array<{
          value: PortableTextObject
          schemaType: AnnotationSchemaType
          at: AnnotationPath
        }>
        elementRef: RefObject<Element | null>
      }
  >({type: 'idle'})

  useEffect(() => {
    return editor.on('selection', () => {
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
          const schemaType = schemaTypes.find(
            (schemaType) => schemaType.name === annotation._type,
          )

          if (!schemaType) {
            return []
          }

          return {
            value: annotation,
            schemaType,
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
  }, [editor, schemaTypes])

  const onRemove = useCallback(
    (annotation: {schemaType: AnnotationSchemaType}) => {
      if (state.type === 'visible') {
        editor.send({
          type: 'annotation.remove',
          annotation: {
            name: annotation.schemaType.name,
          },
        })
        editor.send({type: 'focus'})
      }
    },
    [editor, state],
  )

  const onEdit = useCallback(
    (annotation: {
      at: AnnotationPath
      schemaType: AnnotationSchemaType
      props: {[key: string]: unknown}
    }) => {
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
