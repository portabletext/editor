import {useDecoratorButton} from '@portabletext/toolbar'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {ButtonTooltip} from './button-tooltip'
import type {ToolbarDecoratorDefinition} from './toolbar-schema-definition'

export function DecoratorButton(props: {
  definition: ToolbarDecoratorDefinition
}) {
  const {disabled, active, onToggle} = useDecoratorButton(props)

  return (
    <ButtonTooltip
      label={props.definition.title ?? props.definition.name}
      shortcut={props.definition.shortcut?.keys}
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
