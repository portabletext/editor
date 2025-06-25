import {TooltipTrigger} from 'react-aria-components'
import {useAnnotationButton} from '../plugins/toolbar/use-annotation-button'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {Tooltip} from '../primitives/tooltip'
import {ObjectForm} from './form.object-form'
import type {ToolbarAnnotationDefinition} from './toolbar-schema-definition'

export function AnnotationButton(props: {
  definition: ToolbarAnnotationDefinition
}) {
  const {disabled, active, onAdd, onRemove} = useAnnotationButton(props)

  if (active) {
    return (
      <ToggleButton
        size="sm"
        isSelected={true}
        isDisabled={disabled}
        onPress={onRemove}
      >
        <Icon icon={props.definition.icon} fallback={null} />
      </ToggleButton>
    )
  }

  return (
    <Dialog
      title={props.definition.title ?? props.definition.name}
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
          onSubmit={({value}) => {
            onAdd({value})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
