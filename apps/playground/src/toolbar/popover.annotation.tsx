import {PencilIcon, TrashIcon} from 'lucide-react'
import React from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {useAnnotationPopover} from '../plugins/toolbar/use-annotation-popover'
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
  const {state, onRemove, onEdit, onClose} = useAnnotationPopover()

  if (state.type === 'idle') {
    return null
  }

  return (
    <Popover
      isNonModal
      className="flex flex-col gap-2"
      triggerRef={state.elementRef}
      isOpen={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
        }
      }}
    >
      {state.annotations.map((annotation, index) => (
        <React.Fragment key={annotation.value._key}>
          {index > 0 ? <Separator orientation="horizontal" /> : null}
          <div className="flex gap-2 items-center justify-end">
            <span className="text-sm font-medium">
              {annotation.schemaType.title}
            </span>
            <Dialog
              title={annotation.schemaType.title ?? annotation.schemaType.name}
              icon={
                props.definitions.find(
                  (definition) =>
                    definition.name === annotation.schemaType.name,
                )?.icon
              }
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  onClose()
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
                  fields={annotation.schemaType.fields}
                  defaultValues={annotation.value}
                  onSubmit={({value}) => {
                    onEdit({
                      at: annotation.at,
                      schemaType: annotation.schemaType,
                      props: value,
                    })
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
                  onRemove({schemaType: annotation.schemaType})
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
