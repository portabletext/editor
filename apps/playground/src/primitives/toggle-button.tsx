import {
  composeRenderProps,
  ToggleButton as RACToggleButton,
  type ToggleButtonProps,
} from 'react-aria-components'
import {button} from './button'

export function ToggleButton(props: ToggleButtonProps & {size?: 'sm'}) {
  return (
    <RACToggleButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({
          ...renderProps,
          size: props.size,
          className,
          variant: 'secondary',
        }),
      )}
    />
  )
}
