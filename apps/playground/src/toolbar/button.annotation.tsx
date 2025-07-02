import type {ToolbarAnnotationDefinition} from '@portabletext/toolbar'
import {useAnnotationButton} from '@portabletext/toolbar'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {ButtonTooltip} from './button-tooltip'
import {ObjectForm} from './form.object-form'

export function AnnotationButton(props: {
  definition: ToolbarAnnotationDefinition
}) {
  const {snapshot, send} = useAnnotationButton(props)

  if (
    snapshot.matches({disabled: 'active'}) ||
    snapshot.matches({enabled: 'active'})
  ) {
    return (
      <ButtonTooltip
        label={`Remove ${props.definition.title ?? props.definition.name}`}
        shortcutKeys={props.definition.shortcut?.keys}
      >
        <ToggleButton
          size="sm"
          isSelected={true}
          isDisabled={snapshot.matches('disabled')}
          onPress={() => {
            send({type: 'annotation.remove'})
          }}
        >
          <Icon icon={props.definition.icon} fallback={null} />
        </ToggleButton>
      </ButtonTooltip>
    )
  }

  return (
    <Dialog
      isOpen={snapshot.matches({enabled: {inactive: 'showing insert dialog'}})}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          send({type: 'annotation.insert dialog.dismiss'})
        }
      }}
      title={props.definition.title ?? props.definition.name}
      icon={props.definition.icon}
      trigger={
        <ButtonTooltip
          label={`Add ${props.definition.title ?? props.definition.name}`}
          shortcutKeys={props.definition.shortcut?.keys}
        >
          <Button
            variant="secondary"
            size="sm"
            isDisabled={snapshot.matches('disabled')}
            onPress={() => {
              send({type: 'annotation.insert dialog.show'})
            }}
          >
            <Icon icon={props.definition.icon} fallback={null} />
          </Button>
        </ButtonTooltip>
      }
    >
      {({close}) => (
        <ObjectForm
          submitLabel="Add"
          fields={props.definition.fields}
          defaultValues={props.definition.defaultValues}
          onSubmit={({value}) => {
            send({type: 'annotation.add', annotation: {value}})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
