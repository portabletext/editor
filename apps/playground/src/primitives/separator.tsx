import {tv} from 'tailwind-variants'

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

const styles = tv({
  base: 'bg-gray-200 dark:bg-gray-700 shrink-0 border-0',
  variants: {
    orientation: {
      horizontal: 'h-px w-full',
      vertical: 'w-px self-stretch my-1',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
})

export function Separator(props: SeparatorProps) {
  return (
    <hr
      aria-orientation={props.orientation ?? 'horizontal'}
      className={styles({
        orientation: props.orientation,
        className: props.className,
      })}
    />
  )
}
