import {useDecoratorButton} from '@portabletext/toolbar'
import type {ToolbarDecoratorSchemaType} from '@portabletext/toolbar'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {ButtonTooltip} from './button-tooltip'

export function DecoratorButton(props: {
  schemaType: ToolbarDecoratorSchemaType
}) {
  const decoratorButton = useDecoratorButton(props)

  return (
    <ButtonTooltip
      label={props.schemaType.title ?? props.schemaType.name}
      shortcutKeys={props.schemaType.shortcut?.keys}
    >
      <ToggleButton
        aria-label={props.schemaType.title ?? props.schemaType.name}
        size="sm"
        isDisabled={decoratorButton.snapshot.matches('disabled')}
        isSelected={
          decoratorButton.snapshot.matches({disabled: 'active'}) ||
          decoratorButton.snapshot.matches({enabled: 'active'})
        }
        onPress={() => {
          decoratorButton.send({type: 'toggle'})
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
