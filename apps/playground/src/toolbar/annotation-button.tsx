import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../components/button'
import {ToggleButton} from '../components/toggle-button'
import {Tooltip} from '../components/tooltip'
import type {PlaygroundSchemaDefinition} from '../playground-schema-definition'
import {Icon} from './icon'
import {InsertDialog} from './insert-dialog'
import {ObjectForm} from './object-form'

export function AnnotationButton(props: {
  definition: PlaygroundSchemaDefinition['annotations'][number]
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveAnnotation(props.definition.name),
  )

  if (active) {
    return (
      <ToggleButton
        size="sm"
        isSelected={true}
        isDisabled={disabled}
        onPress={() => {
          editor.send({
            type: 'annotation.remove',
            annotation: {
              name: props.definition.name,
            },
          })
          editor.send({type: 'focus'})
        }}
      >
        <Icon icon={props.definition.icon} fallback={null} />
      </ToggleButton>
    )
  }

  return (
    <InsertDialog
      title={props.definition.title}
      icon={props.definition.icon}
      trigger={
        <TooltipTrigger>
          <Button variant="secondary" size="sm" isDisabled={disabled}>
            <Icon icon={props.definition.icon} fallback={null} />
          </Button>
          <Tooltip>Add {props.definition.title}</Tooltip>
        </TooltipTrigger>
      }
    >
      {({close}) => (
        <ObjectForm
          submitLabel="Add"
          fields={props.definition.fields}
          defaultValues={props.definition.defaultValues}
          onSubmit={({values}) => {
            editor.send({
              type: 'annotation.add',
              annotation: {
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
