import {TooltipTrigger} from 'react-aria-components'
import {useListButton} from '../plugins/toolbar/use-list-button'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {Tooltip} from '../primitives/tooltip'
import type {ToolbarListDefinition} from './toolbar-schema-definition'

export function ListButton(props: {definition: ToolbarListDefinition}) {
  const {disabled, active, onToggle} = useListButton(props)

  return (
    <TooltipTrigger>
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
      <Tooltip>{props.definition.title}</Tooltip>
    </TooltipTrigger>
  )
}
