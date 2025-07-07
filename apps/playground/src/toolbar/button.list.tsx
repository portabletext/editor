import {useListButton} from '@portabletext/toolbar'
import type {ToolbarListSchemaType} from '@portabletext/toolbar'
import {TooltipTrigger} from 'react-aria-components'
import {Icon} from '../primitives/icon'
import {ToggleButton} from '../primitives/toggle-button'
import {Tooltip} from '../primitives/tooltip'

export function ListButton(props: {schemaType: ToolbarListSchemaType}) {
  const listButton = useListButton(props)

  return (
    <TooltipTrigger>
      <ToggleButton
        aria-label={props.schemaType.title ?? props.schemaType.name}
        size="sm"
        isDisabled={listButton.snapshot.matches('disabled')}
        isSelected={listButton.snapshot.matches({enabled: 'active'})}
        onPress={() => {
          listButton.send({type: 'toggle'})
        }}
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
