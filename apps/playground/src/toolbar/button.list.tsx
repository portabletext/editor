import {useListButton} from '@portabletext/toolbar'
import type {ToolbarListSchemaType} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {Tooltip} from '../primitives/tooltip'

export function ListButton(props: {schemaType: ToolbarListSchemaType}) {
  const {disabled, active, onToggle} = useListButton(props)

  return (
    <TooltipTrigger>
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
      <Tooltip>{props.schemaType.title}</Tooltip>
    </TooltipTrigger>
  )
}
