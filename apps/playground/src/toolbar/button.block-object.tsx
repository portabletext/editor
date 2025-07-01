import {useBlockObjectButton} from '@portabletext/toolbar'
import type {ToolbarBlockObjectDefinition} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Icon} from '../primitives/icon'
import {Tooltip} from '../primitives/tooltip'
import {InsertBlockObjectForm} from './form.insert-block-object'

export function BlockObjectButton(props: {
  definition: ToolbarBlockObjectDefinition
}) {
  const {disabled, onInsert} = useBlockObjectButton(props)

  return (
    <Dialog
      title={props.definition.title ?? props.definition.name}
      icon={props.definition.icon}
      trigger={
        <TooltipTrigger>
          <Button variant="secondary" size="sm" isDisabled={disabled}>
            <Icon icon={props.definition.icon} fallback={null} />
            {props.definition.title}
          </Button>
          <Tooltip>Insert {props.definition.title}</Tooltip>
        </TooltipTrigger>
      }
    >
      {({close}) => (
        <InsertBlockObjectForm
          fields={props.definition.fields}
          defaultValues={props.definition.defaultValues}
          onSubmit={({value, placement}) => {
            onInsert({value, placement})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
