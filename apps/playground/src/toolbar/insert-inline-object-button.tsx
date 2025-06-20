import {useEditor, useEditorSelector} from '@portabletext/editor'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../components/button'
import {Tooltip} from '../components/tooltip'
import type {PlaygroundSchemaDefinition} from '../playground-schema-definition'
import {Icon} from './icon'
import {InsertDialog} from './insert-dialog'
import {ObjectForm} from './object-form'

export function InsertInlineObjectButton(props: {
  definition: PlaygroundSchemaDefinition['inlineObjects'][number]
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
          onSubmit={({values}) => {
            editor.send({
              type: 'insert.inline object',
              inlineObject: {
                name: props.definition.name,
                value: values,
              },
            })
            editor.send({type: 'focus'})
            close()
          }}
        />
      )}
    </InsertDialog>
  )
}
