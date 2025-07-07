import {useInlineObjectButton} from '@portabletext/toolbar'
import type {ToolbarInlineObjectSchemaType} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Icon} from '../primitives/icon'
import {Tooltip} from '../primitives/tooltip'
import {ObjectForm} from './form.object-form'

export function InlineObjectButton(props: {
  schemaType: ToolbarInlineObjectSchemaType
}) {
  const {disabled, onInsert} = useInlineObjectButton(props)

  return (
    <Dialog
      title={props.schemaType.title ?? props.schemaType.name}
      icon={props.schemaType.icon}
      trigger={
        <TooltipTrigger>
          <Button variant="secondary" size="sm" isDisabled={disabled}>
            <Icon icon={props.schemaType.icon} fallback={null} />
            {props.schemaType.title ?? props.schemaType.name}
          </Button>
          <Tooltip>
            Insert {props.schemaType.title ?? props.schemaType.name}
          </Tooltip>
        </TooltipTrigger>
      }
    >
      {({close}) => (
        <ObjectForm
          submitLabel="Insert"
          fields={props.schemaType.fields}
          defaultValues={props.schemaType.defaultValues}
          onSubmit={({value}) => {
            onInsert({value})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
