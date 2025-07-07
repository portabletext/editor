import {useAnnotationPopover} from '@portabletext/toolbar'
import type {ToolbarAnnotationSchemaType} from '@portabletext/toolbar'
import {PencilIcon, TrashIcon} from 'lucide-react'
import React from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Popover} from '../primitives/popover'
import {Separator} from '../primitives/separator'
import {Tooltip} from '../primitives/tooltip'
import {ObjectForm} from './form.object-form'

export function AnnotationPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarAnnotationSchemaType>
}) {
  const {state, onRemove, onEdit, onClose} = useAnnotationPopover(props)

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
              icon={annotation.schemaType.icon}
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
