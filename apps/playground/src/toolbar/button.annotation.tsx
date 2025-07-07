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
  const annotationButton = useAnnotationButton(props)

  if (
    annotationButton.snapshot.matches({disabled: 'active'}) ||
    annotationButton.snapshot.matches({enabled: 'active'})
  ) {
    return (
      <ButtonTooltip
        label={`Remove ${props.schemaType.title ?? props.schemaType.name}`}
        shortcutKeys={props.schemaType.shortcut?.keys}
      >
        <ToggleButton
          size="sm"
          isSelected={true}
          isDisabled={annotationButton.snapshot.matches('disabled')}
          onPress={() => {
            annotationButton.send({type: 'remove'})
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
      isOpen={annotationButton.snapshot.matches({
        enabled: {inactive: 'showing dialog'},
      })}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          annotationButton.send({type: 'close dialog'})
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
            isDisabled={annotationButton.snapshot.matches('disabled')}
            onPress={() => {
              annotationButton.send({type: 'open dialog'})
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
            annotationButton.send({type: 'add', annotation: {value}})
            close()
          }}
        />
      )}
    </Dialog>
  )
}
