import {useEditor, useEditorSelector} from '@portabletext/editor'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Icon} from '../primitives/icon'
import {Tooltip} from '../primitives/tooltip'
import {InsertBlockObjectForm} from './form.insert-block-object'
import type {ToolbarBlockObjectDefinition} from './toolbar-schema-definition'

export function BlockObjectButton(props: {
  definition: ToolbarBlockObjectDefinition
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

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
    </Dialog>
  )
}
