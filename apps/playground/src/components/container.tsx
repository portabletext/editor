import type {HTMLAttributes} from 'react'
import {twMerge} from 'tailwind-merge'
import {tv} from 'tailwind-variants'

export const container = tv({
  base: 'bg-white',
  variants: {
    variant: {
      default: 'p-2 rounded-md shadow-sm',
      ghost: '',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export function Container(
  props: HTMLAttributes<HTMLDivElement> & {
    className?: string
    variant?: 'default' | 'ghost'
  },
) {
  const {className, children, ...rest} = props
  return (
    <div
      className={twMerge(container({variant: props.variant}), className)}
      {...rest}
    >
      {children}
    </div>
  )
}
