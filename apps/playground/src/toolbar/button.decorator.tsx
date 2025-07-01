import {useDecoratorButton} from '@portabletext/toolbar'
import type {ToolbarDecoratorDefinition} from '@portabletext/toolbar'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {ButtonTooltip} from './button-tooltip'

export function DecoratorButton(props: {
  definition: ToolbarDecoratorDefinition
}) {
  const {disabled, active, onToggle} = useDecoratorButton(props)

  return (
    <ButtonTooltip
      label={props.definition.title ?? props.definition.name}
      shortcutKeys={props.definition.shortcut?.keys}
    >
      <ToggleButton
        aria-label={props.definition.title ?? props.definition.name}
        size="sm"
        isDisabled={disabled}
        isSelected={active}
        onPress={onToggle}
      >
        <Icon
          icon={props.definition.icon}
          fallback={props.definition.title ?? props.definition.name}
        />
      </ToggleButton>
    </ButtonTooltip>
  )
}
