import {
  useEditor,
  type EditorSchema,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {PencilIcon, TrashIcon} from 'lucide-react'
import React, {useEffect, useState, type RefObject} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../components/button'
import {Popover} from '../components/popover'
import {Tooltip} from '../components/tooltip'
import {InsertDialog} from './insert-dialog'
import {ObjectForm} from './object-form'

export function AnnotationPopover() {
  const editor = useEditor()
  const [state, setState] = useState<
    | {
        type: 'idle'
      }
    | {
        type: 'visible'
        annotation: PortableTextObject
        definition: EditorSchema['annotations'][number]
        triggerRef: RefObject<Element | null>
      }
  >({type: 'idle'})

  useEffect(() => {
    return editor.on('selection', () => {
      const snapshot = editor.getSnapshot()
      const activeAnnotations = selectors.getActiveAnnotations(snapshot)
      const firstActiveAnnotation = activeAnnotations.at(0)

      if (!firstActiveAnnotation) {
        setState({type: 'idle'})
        return
      }

      const definition = snapshot.context.schema.annotations.find(
        (annotation) => annotation.name === firstActiveAnnotation._type,
      )

      if (!definition) {
        setState({type: 'idle'})
        return
      }

      const selectedChildren = editor.dom.getChildNodes(snapshot)

      const firstSelectedChild = selectedChildren.at(0)

      if (!firstSelectedChild || !(firstSelectedChild instanceof Element)) {
        setState({type: 'idle'})
        return
      }

      const triggerRef = React.createRef<Element>()
      triggerRef.current = firstSelectedChild

      setState({
        type: 'visible',
        annotation: firstActiveAnnotation,
        definition,
        triggerRef,
      })
    }).unsubscribe
  }, [editor])

  if (state.type === 'idle') {
    return null
  }

  return (
    <Popover
      isNonModal
      className="flex gap-2 items-center"
      triggerRef={state.triggerRef}
      isOpen={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setState({type: 'idle'})
        }
      }}
    >
      <InsertDialog
        title={state.definition.title ?? state.definition.name}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setState({type: 'idle'})
          }
        }}
        trigger={
          <TooltipTrigger>
            <Button
              aria-label="Edit"
              variant="secondary"
              size="sm"
              onPress={() => {}}
            >
              <PencilIcon className="size-3" />
            </Button>
            <Tooltip>Edit</Tooltip>
          </TooltipTrigger>
        }
      >
        {({close}) => (
          <ObjectForm
            submitLabel="Save"
            fields={state.definition.fields}
            defaultValues={state.annotation}
            onSubmit={({values}) => {
              editor.send({
                type: 'annotation.add',
                annotation: {
                  name: state.annotation._type,
                  value: values,
                },
              })
              editor.send({type: 'focus'})
              close()
            }}
          />
        )}
      </InsertDialog>
      <TooltipTrigger>
        <Button
          aria-label="Remove"
          variant="destructive"
          size="sm"
          onPress={() => {
            editor.send({
              type: 'annotation.remove',
              annotation: {
                name: state.annotation._type,
              },
            })
            editor.send({type: 'focus'})
          }}
        >
          <TrashIcon className="size-3" />
        </Button>
        <Tooltip>Remove</Tooltip>
      </TooltipTrigger>
    </Popover>
  )
}
