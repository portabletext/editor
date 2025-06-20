import {
  useEditor,
  type AnnotationPath,
  type PortableTextObject,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {PencilIcon, TrashIcon} from 'lucide-react'
import React, {useEffect, useState, type RefObject} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Popover} from '../primitives/popover'
import {Separator} from '../primitives/separator'
import {Tooltip} from '../primitives/tooltip'
import {ObjectForm} from './form.object-form'
import type {ToolbarAnnotationDefinition} from './toolbar-schema-definition'

export function AnnotationPopover(props: {
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
        triggerRef: RefObject<Element | null>
      }
  >({type: 'idle'})

  useEffect(() => {
    return editor.on('selection', () => {
      const snapshot = editor.getSnapshot()
      const activeAnnotations = selectors.getActiveAnnotations(snapshot)
      const focusBlock = selectors.getFocusBlock(snapshot)

      if (activeAnnotations.length === 0 || !focusBlock) {
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
        triggerRef,
      })
    }).unsubscribe
  }, [editor, props.definitions])

  if (state.type === 'idle') {
    return null
  }

  return (
    <Popover
      isNonModal
      className="flex flex-col gap-2"
      triggerRef={state.triggerRef}
      isOpen={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setState({type: 'idle'})
          editor.send({type: 'focus'})
        }
      }}
    >
      {state.annotations.map((annotation, index) => (
        <React.Fragment key={annotation.value._key}>
          {index > 0 ? <Separator orientation="horizontal" /> : null}
          <div className="flex gap-2 items-center justify-end">
            <span className="text-sm font-medium">
              {annotation.definition.title}
            </span>
            <Dialog
              title={annotation.definition.title ?? annotation.definition.name}
              icon={annotation.definition.icon}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setState({type: 'idle'})
                  editor.send({type: 'focus'})
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
                  fields={annotation.definition.fields}
                  defaultValues={annotation.value}
                  onSubmit={({values}) => {
                    editor.send({
                      type: 'annotation.set',
                      at: annotation.at,
                      props: values,
                    })
                    editor.send({type: 'focus'})
                    close()
                  }}
                />
              )}
            </Dialog>
            <TooltipTrigger>
              <Button
                aria-label="Remove"
                variant="destructive"
                size="sm"
                onPress={() => {
                  editor.send({
                    type: 'annotation.remove',
                    annotation: {
                      name: annotation.definition.name,
                    },
                  })
                  editor.send({type: 'focus'})
                }}
              >
                <TrashIcon className="size-3" />
              </Button>
              <Tooltip>Remove</Tooltip>
            </TooltipTrigger>
          </div>
        </React.Fragment>
      ))}
    </Popover>
  )
}
