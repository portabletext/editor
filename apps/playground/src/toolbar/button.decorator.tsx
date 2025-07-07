import {useDecoratorButton} from '@portabletext/toolbar'
import type {ToolbarDecoratorSchemaType} from '@portabletext/toolbar'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {ButtonTooltip} from './button-tooltip'

export function DecoratorButton(props: {
  schemaType: ToolbarDecoratorSchemaType
}) {
  const {disabled, active, onToggle} = useDecoratorButton(props)

  return (
    <ButtonTooltip
      label={props.schemaType.title ?? props.schemaType.name}
      shortcutKeys={props.schemaType.shortcut?.keys}
    >
      <ToggleButton
        aria-label={props.schemaType.title ?? props.schemaType.name}
        size="sm"
        isDisabled={disabled}
        isSelected={active}
        onPress={onToggle}
      >
        <Icon
          icon={props.schemaType.icon}
          fallback={props.schemaType.title ?? props.schemaType.name}
        />
      </ToggleButton>
    </ButtonTooltip>
  )
}
