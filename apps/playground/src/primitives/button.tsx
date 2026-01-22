import {
  composeRenderProps,
  Button as RACButton,
  type ButtonProps as RACButtonProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {focusRing} from './utils'

export interface ButtonProps extends RACButtonProps {
  size?: 'sm'
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
}

export const button = tv({
  extend: focusRing,
  base: 'inline-flex items-center gap-2 px-5 py-2 text-sm text-center transition rounded-lg border border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] cursor-default',
  variants: {
    variant: {
      ghost:
        'border-none shadow-none bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 pressed:bg-gray-200 dark:pressed:bg-gray-600',
      primary: 'bg-blue-600 pressed:bg-blue-800 text-white',
      secondary:
        'bg-gray-100 dark:bg-gray-700 pressed:bg-gray-300 dark:pressed:bg-gray-600 text-gray-800 dark:text-gray-100',
      destructive: 'bg-red-700 pressed:bg-red-900 text-white',
    },
    isDisabled: {
      true: 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-black/5 dark:border-white/5',
    },
    isSelected: {
      true: '',
    },
    size: {
      sm: 'text-xs px-2 py-1',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
  compoundVariants: [
    {
      variant: 'primary',
      isDisabled: false,
      class: 'hover:bg-blue-700',
    },
    {
      variant: 'secondary',
      isDisabled: false,
      class: 'hover:bg-gray-200 dark:hover:bg-gray-600',
    },
    {
      variant: 'destructive',
      isDisabled: false,
      class: 'hover:bg-red-800',
    },
    {
      variant: 'secondary',
      isSelected: true,
      class:
        'bg-gray-700 dark:bg-gray-200 hover:bg-gray-800 dark:hover:bg-gray-300 pressed:bg-gray-900 dark:pressed:bg-gray-400 text-white dark:text-gray-900',
    },
    {
      variant: 'ghost',
      size: 'sm',
      class: 'p-0',
    },
  ],
})

export function Button(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({
          ...renderProps,
          variant: props.variant,
          size: props.size,
          className,
        }),
      )}
    />
  )
}
