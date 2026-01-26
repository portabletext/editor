import {
  composeRenderProps,
  ToggleButton as RACToggleButton,
  type ToggleButtonProps,
} from 'react-aria-components'
import {button, type ButtonProps} from './button'

export function ToggleButton(
  props: ToggleButtonProps & {size?: 'sm'; variant?: ButtonProps['variant']},
) {
  return (
    <RACToggleButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({
          ...renderProps,
          size: props.size,
          className,
          variant: props.variant ?? 'secondary',
        }),
      )}
    />
  )
}
