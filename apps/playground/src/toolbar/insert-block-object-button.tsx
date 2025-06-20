import {useEditor, useEditorSelector} from '@portabletext/editor'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../components/button'
import {Tooltip} from '../components/tooltip'
import type {PlaygroundSchemaDefinition} from '../playground-schema-definition'
import {BlockObjectForm} from './block-object-form'
import {Icon} from './icon'
import {InsertDialog} from './insert-dialog'

export function InsertBlockObjectButton(props: {
  definition: PlaygroundSchemaDefinition['blockObjects'][number]
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  return (
    <InsertDialog
      title={props.definition.title}
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
        <BlockObjectForm
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
    </InsertDialog>
  )
}
