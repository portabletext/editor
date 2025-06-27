import {useInlineObjectPopover} from '@portabletext/toolbar'
import {PencilIcon, TrashIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Popover} from '../primitives/popover'
import {Tooltip} from '../primitives/tooltip'
import {ObjectForm} from './form.object-form'
import type {ToolbarInlineObjectDefinition} from './toolbar-schema-definition'

export function InlineObjectPopover(props: {
  definitions: ReadonlyArray<ToolbarInlineObjectDefinition>
}) {
  const {state, onRemove, onEdit, onClose} = useInlineObjectPopover()

  if (state.type === 'idle') {
    return null
  }

  return (
    <Popover
      isNonModal
      className="flex gap-2"
      triggerRef={state.elementRef}
      isOpen={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
        }
      }}
    >
      {state.object.schemaType.fields.length > 0 ? (
        <Dialog
          title={state.object.schemaType.title ?? state.object.schemaType.name}
          icon={
            props.definitions.find(
              (definition) => definition.name === state.object.schemaType.name,
            )?.icon
          }
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              onClose()
            }
          }}
          trigger={
            <TooltipTrigger>
              <Button aria-label="Edit" variant="secondary" size="sm">
                <PencilIcon className="size-3" />
              </Button>
              <Tooltip>Edit</Tooltip>
            </TooltipTrigger>
          }
        >
          {({close}) => (
            <ObjectForm
              submitLabel="Save"
              fields={state.object.schemaType.fields}
              defaultValues={state.object.value}
              onSubmit={({value}) => {
                onEdit({props: value})
                close()
              }}
            />
          )}
        </Dialog>
      ) : null}
      <TooltipTrigger>
        <Button
          aria-label="Remove"
          variant="destructive"
          size="sm"
          onPress={onRemove}
        >
          <TrashIcon className="size-3" />
        </Button>
        <Tooltip>Remove</Tooltip>
      </TooltipTrigger>
    </Popover>
  )
}
