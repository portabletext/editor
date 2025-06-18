import {useEditor, useEditorSelector} from '@portabletext/editor'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../components/button'
import {Tooltip} from '../components/tooltip'
import {BlockObjectForm} from './block-object-form'
import {Icon} from './icon'
import {InsertDialog} from './insert-dialog'

export function InsertBlockObjectButton(props: {
  definition: {
    name: string
    title?: string
    icon?: React.ComponentType
  }
  fields: ReadonlyArray<{
    name: string
    title?: string
    type: 'string' | 'number'
  }>
  defaultValues: Record<string, string | number>
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <InsertDialog
      title={props.definition.title ?? props.definition.name}
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
        <BlockObjectForm
          fields={props.fields}
          defaultValues={props.defaultValues}
          onSubmit={({values, placement}) => {
            editor.send({
              type: 'insert.block object',
              blockObject: {
                name: props.definition.name,
                value: values,
              },
              placement: placement ?? 'auto',
            })
            editor.send({type: 'focus'})
            close()
          }}
        />
      )}
    </InsertDialog>
  )
}
