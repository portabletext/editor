import {Button} from '@/components/ui/button'
import {useListButton} from '@portabletext/toolbar'
import type {ToolbarListSchemaType} from '@portabletext/toolbar'
import {ButtonTooltip} from './button-tooltip'

export function ListButton(props: {schemaType: ToolbarListSchemaType}) {
  const listButton = useListButton(props)

  const isActive =
    listButton.snapshot.matches({disabled: 'active'}) ||
    listButton.snapshot.matches({enabled: 'active'})
  const isDisabled = listButton.snapshot.matches('disabled')
  const Icon = props.schemaType.icon

  return (
    <ButtonTooltip label={props.schemaType.title ?? props.schemaType.name}>
      <Button
        aria-label={props.schemaType.title ?? props.schemaType.name}
        aria-pressed={isActive}
        size="icon-sm"
        variant={isActive ? 'default' : 'ghost'}
        disabled={isDisabled}
        onClick={() => {
          listButton.send({type: 'toggle'})
        }}
      >
        {Icon ? (
          <Icon className="size-4" />
        ) : (
          <span className="text-xs">
            {props.schemaType.title ?? props.schemaType.name}
          </span>
        )}
      </Button>
    </ButtonTooltip>
  )
}
