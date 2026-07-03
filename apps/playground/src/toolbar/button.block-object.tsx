import {useEditor} from '@portabletext/editor'
import {useApplicableSchema, useBlockObjectButton} from '@portabletext/toolbar'
import type {ToolbarBlockObjectSchemaType} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {defaultTableValue} from '../plugins/table-defaults'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import type {FieldOption} from '../primitives/fields'
import {Icon} from '../primitives/icon'
import {Tooltip} from '../primitives/tooltip'
import {InsertBlockObjectForm} from './form.insert-block-object'

export function BlockObjectButton(props: {
  schemaType: ToolbarBlockObjectSchemaType & {
    fieldOptions?: Record<string, FieldOption | undefined>
  }
}) {
  const {snapshot, send} = useBlockObjectButton(props)
  const applicable = useApplicableSchema()
  const editor = useEditor()

  if (props.schemaType.name === 'table') {
    // Tables skip the field dialog: every insert wants the same 3x3 shape
    // with one header row, so the button inserts it directly.
    return (
      <TooltipTrigger>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={
            !applicable.blockObjects.has(props.schemaType.name) ||
            snapshot.matches('disabled')
          }
          onPress={() => {
            editor.send({
              type: 'insert.block object',
              blockObject: {
                name: props.schemaType.name,
                value: defaultTableValue(),
              },
              placement: 'auto',
            })
            editor.send({type: 'focus'})
          }}
        >
          <Icon icon={props.schemaType.icon} fallback={null} />
          {props.schemaType.title}
        </Button>
        <Tooltip>Insert {props.schemaType.title}</Tooltip>
      </TooltipTrigger>
    )
  }

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
            isDisabled={
              !applicable.blockObjects.has(props.schemaType.name) ||
              snapshot.matches('disabled')
            }
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
          fieldOptions={props.schemaType.fieldOptions}
          onSubmit={({value, placement}) => {
            send({type: 'insert', value, placement})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
