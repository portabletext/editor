import type {HTMLAttributes} from 'react'
import {twMerge} from 'tailwind-merge'
import {tv} from 'tailwind-variants'

export const container = tv({
  base: 'bg-white dark:bg-gray-800',
  variants: {
    variant: {
      default:
        'p-3 rounded-md shadow-sm border border-gray-200 dark:border-gray-700',
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
