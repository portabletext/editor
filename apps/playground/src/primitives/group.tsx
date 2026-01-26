import {
  composeRenderProps,
  Group as RACGroup,
  type GroupProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'

const styles = tv({
  base: 'flex items-center gap-0.5',
})

export function Group(props: GroupProps) {
  return (
    <RACGroup
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({...renderProps, className}),
      )}
    />
  )
}
