import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from '../components/button'
import {ToggleButton} from '../components/toggle-button'
import {Tooltip} from '../components/tooltip'
import {Icon} from './icon'
import {InsertDialog} from './insert-dialog'
import {ObjectForm} from './object-form'

export function AnnotationButton(props: {
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
      title={props.definition.title ?? props.definition.name}
      trigger={
        <TooltipTrigger>
          <Button variant="secondary" size="sm" isDisabled={disabled}>
            <Icon icon={props.definition.icon} fallback={null} />
          </Button>
          <Tooltip>
            Add {props.definition.title ?? props.definition.name}
          </Tooltip>
        </TooltipTrigger>
      }
    >
      {({close}) => (
        <ObjectForm
          submitLabel="Add"
          fields={props.fields}
          defaultValues={props.defaultValues}
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
