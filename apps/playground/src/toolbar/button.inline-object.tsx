import {TooltipTrigger} from 'react-aria-components'
import {useInlineObjectButton} from '../plugins/toolbar/use-inline-object-button'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Icon} from '../primitives/icon'
import {Tooltip} from '../primitives/tooltip'
import {ObjectForm} from './form.object-form'
import type {ToolbarInlineObjectDefinition} from './toolbar-schema-definition'

export function InlineObjectButton(props: {
  definition: ToolbarInlineObjectDefinition
}) {
  const {disabled, onInsert} = useInlineObjectButton(props)

  return (
    <Dialog
      title={props.definition.title ?? props.definition.name}
      icon={props.definition.icon}
      trigger={
        <TooltipTrigger>
          <Button variant="secondary" size="sm" isDisabled={disabled}>
            <Icon icon={props.definition.icon} fallback={null} />
            {props.definition.title ?? props.definition.name}
          </Button>
          <Tooltip>
            Insert {props.definition.title ?? props.definition.name}
          </Tooltip>
        </TooltipTrigger>
      }
    >
      {({close}) => (
        <ObjectForm
          submitLabel="Insert"
          fields={props.definition.fields}
          defaultValues={props.definition.defaultValues}
          onSubmit={({value}) => {
            onInsert({value})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
