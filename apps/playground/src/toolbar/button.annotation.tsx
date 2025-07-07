import type {ToolbarAnnotationSchemaType} from '@portabletext/toolbar'
import {useAnnotationButton} from '@portabletext/toolbar'
import {Button} from '../primitives/button'
import {Dialog} from '../primitives/dialog'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {ButtonTooltip} from './button-tooltip'
import {ObjectForm} from './form.object-form'

export function AnnotationButton(props: {
  schemaType: ToolbarAnnotationSchemaType
}) {
  const {snapshot, send} = useAnnotationButton(props)

  if (
    snapshot.matches({disabled: 'active'}) ||
    snapshot.matches({enabled: 'active'})
  ) {
    return (
      <ButtonTooltip
        label={`Remove ${props.schemaType.title ?? props.schemaType.name}`}
        shortcutKeys={props.schemaType.shortcut?.keys}
      >
        <ToggleButton
          size="sm"
          isSelected={true}
          isDisabled={snapshot.matches('disabled')}
          onPress={() => {
            send({type: 'annotation.remove'})
          }}
        >
          <Icon
            icon={props.schemaType.icon}
            fallback={props.schemaType.title ?? props.schemaType.name}
          />
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
      title={props.schemaType.title ?? props.schemaType.name}
      icon={props.schemaType.icon}
      trigger={
        <ButtonTooltip
          label={`Add ${props.schemaType.title ?? props.schemaType.name}`}
          shortcutKeys={props.schemaType.shortcut?.keys}
        >
          <Button
            variant="secondary"
            size="sm"
            isDisabled={snapshot.matches('disabled')}
            onPress={() => {
              send({type: 'annotation.insert dialog.show'})
            }}
          >
            <Icon
              icon={props.schemaType.icon}
              fallback={props.schemaType.title ?? props.schemaType.name}
            />
          </Button>
        </ButtonTooltip>
      }
    >
      {({close}) => (
        <ObjectForm
          submitLabel="Add"
          fields={props.schemaType.fields}
          defaultValues={props.schemaType.defaultValues}
          onSubmit={({value}) => {
            send({type: 'annotation.add', annotation: {value}})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
