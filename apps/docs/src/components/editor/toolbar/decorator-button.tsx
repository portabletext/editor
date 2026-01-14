import {Button} from '@/components/ui/button'
import {useDecoratorButton} from '@portabletext/toolbar'
import type {ToolbarDecoratorSchemaType} from '@portabletext/toolbar'
import {ButtonTooltip} from './button-tooltip'

export function DecoratorButton(props: {
  schemaType: ToolbarDecoratorSchemaType
}) {
  const decoratorButton = useDecoratorButton(props)

  const isActive =
    decoratorButton.snapshot.matches({disabled: 'active'}) ||
    decoratorButton.snapshot.matches({enabled: 'active'})
  const isDisabled = decoratorButton.snapshot.matches('disabled')
  const Icon = props.schemaType.icon

  return (
    <ButtonTooltip
      label={props.schemaType.title ?? props.schemaType.name}
      shortcutKeys={props.schemaType.shortcut?.keys}
    >
      <Button
        aria-label={props.schemaType.title ?? props.schemaType.name}
        aria-pressed={isActive}
        size="icon-sm"
        variant={isActive ? 'default' : 'ghost'}
        disabled={isDisabled}
        onClick={() => {
          decoratorButton.send({type: 'toggle'})
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
