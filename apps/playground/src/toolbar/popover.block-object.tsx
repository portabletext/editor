import {useBlockObjectPopover} from '@portabletext/toolbar'
import type {ToolbarBlockObjectSchemaType} from '@portabletext/toolbar'
import {PencilIcon, TrashIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Popover} from '../primitives/popover'
import {Tooltip} from '../primitives/tooltip'
import {ObjectForm} from './form.object-form'

export function BlockObjectPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarBlockObjectSchemaType>
}) {
  const blockObjectPopover = useBlockObjectPopover(props)

  if (
    blockObjectPopover.snapshot.matches('disabled') ||
    blockObjectPopover.snapshot.matches({enabled: 'inactive'})
  ) {
    return null
  }

  const blockObject = blockObjectPopover.snapshot.context.blockObjects.at(0)

  if (!blockObject) {
    return null
  }

  return (
    <Popover
      isNonModal
      placement="right"
      className="flex flex-col gap-2"
      triggerRef={blockObjectPopover.snapshot.context.elementRef}
      isOpen={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          blockObjectPopover.send({type: 'close'})
        }
      }}
    >
      {blockObject.schemaType.fields.length > 0 ? (
        <Dialog
          title={blockObject.schemaType.title ?? blockObject.schemaType.name}
          icon={blockObject.schemaType.icon}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              blockObjectPopover.send({type: 'close'})
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
              fields={blockObject.schemaType.fields}
              defaultValues={blockObject.value}
              onSubmit={({value}) => {
                blockObjectPopover.send({
                  type: 'edit',
                  at: blockObject.at,
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
            blockObjectPopover.send({type: 'remove', at: blockObject.at})
          }}
        >
          <TrashIcon className="size-3" />
        </Button>
        <Tooltip>Remove</Tooltip>
      </TooltipTrigger>
    </Popover>
  )
}
