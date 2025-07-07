import type {ToolbarInlineObjectSchemaType} from '@portabletext/toolbar'
import {useInlineObjectPopover} from '@portabletext/toolbar'
import {PencilIcon, TrashIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Popover} from '../primitives/popover'
import {Tooltip} from '../primitives/tooltip'
import {ObjectForm} from './form.object-form'

export function InlineObjectPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarInlineObjectSchemaType>
}) {
  const inlineObjectPopover = useInlineObjectPopover(props)

  if (
    inlineObjectPopover.snapshot.matches('disabled') ||
    inlineObjectPopover.snapshot.matches({enabled: 'inactive'})
  ) {
    return null
  }

  const inlineObject = inlineObjectPopover.snapshot.context.inlineObjects.at(0)

  if (!inlineObject) {
    return null
  }

  return (
    <Popover
      isNonModal
      className="flex gap-2"
      triggerRef={inlineObjectPopover.snapshot.context.elementRef}
      isOpen={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          inlineObjectPopover.send({type: 'close'})
        }
      }}
    >
      {inlineObject.schemaType.fields.length > 0 ? (
        <Dialog
          title={inlineObject.schemaType.title ?? inlineObject.schemaType.name}
          icon={inlineObject.schemaType.icon}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              inlineObjectPopover.send({type: 'close'})
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
              fields={inlineObject.schemaType.fields}
              defaultValues={inlineObject.value}
              onSubmit={({value}) => {
                inlineObjectPopover.send({
                  type: 'edit',
                  at: inlineObject.at,
                  props: value,
                })
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
          onPress={() => {
            inlineObjectPopover.send({type: 'remove', at: inlineObject.at})
          }}
        >
          <TrashIcon className="size-3" />
        </Button>
        <Tooltip>Remove</Tooltip>
      </TooltipTrigger>
    </Popover>
  )
}
