import {
  composeRenderProps,
  Toolbar as RACToolbar,
  ToolbarProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'

const styles = tv({
  base: 'flex gap-2 flex-wrap',
})

export function Toolbar(props: ToolbarProps) {
  return (
    <RACToolbar
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({...renderProps, className}),
      )}
    />
  )
}
