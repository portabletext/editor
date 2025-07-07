import {useBlockObjectButton} from '@portabletext/toolbar'
import type {ToolbarBlockObjectSchemaType} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Icon} from '../primitives/icon'
import {Tooltip} from '../primitives/tooltip'
import {InsertBlockObjectForm} from './form.insert-block-object'

export function BlockObjectButton(props: {
  schemaType: ToolbarBlockObjectSchemaType
}) {
  const {snapshot, send} = useBlockObjectButton(props)

  return (
    <Dialog
      title={props.schemaType.title ?? props.schemaType.name}
      icon={props.schemaType.icon}
      isOpen={snapshot.matches({enabled: 'showing dialog'})}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          send({type: 'open dialog'})
        } else {
          send({type: 'close dialog'})
        }
      }}
      trigger={
        <TooltipTrigger>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={snapshot.matches('disabled')}
          >
            <Icon icon={props.schemaType.icon} fallback={null} />
            {props.schemaType.title}
          </Button>
          <Tooltip>Insert {props.schemaType.title}</Tooltip>
        </TooltipTrigger>
      }
    >
      {({close}) => (
        <InsertBlockObjectForm
          fields={props.schemaType.fields}
          defaultValues={props.schemaType.defaultValues}
          onSubmit={({value, placement}) => {
            send({type: 'insert', value, placement})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
