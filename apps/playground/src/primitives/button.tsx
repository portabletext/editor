import {
  composeRenderProps,
  Button as RACButton,
  Link as RACLink,
  type ButtonProps as RACButtonProps,
  type LinkProps as RACLinkProps,
} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import {focusRing} from './utils'

export interface ButtonProps extends RACButtonProps {
  size?: 'sm'
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
}

export interface LinkButtonProps extends RACLinkProps {
  size?: 'sm'
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost'
}

export const button = tv({
  extend: focusRing,
  base: 'inline-flex shrink-0 items-center justify-center gap-1.5 px-4 py-2 text-sm text-center transition-all duration-150 rounded-md cursor-default font-medium',
  variants: {
    variant: {
      ghost:
        'bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50 pressed:bg-gray-200 dark:pressed:bg-gray-600',
      primary:
        'bg-blue-600 hover:bg-blue-700 pressed:bg-blue-800 text-white shadow-sm',
      secondary:
        'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 pressed:bg-gray-100 dark:pressed:bg-gray-500 text-gray-700 dark:text-gray-100 border border-gray-200 dark:border-gray-600',
      destructive:
        'bg-red-600 hover:bg-red-700 pressed:bg-red-800 text-white shadow-sm',
    },
    isDisabled: {
      true: 'opacity-50 pointer-events-none',
    },
    isSelected: {
      true: '',
    },
    size: {
      sm: 'text-xs px-2 py-1.5 rounded',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
  compoundVariants: [
    {
      variant: 'secondary',
      isSelected: true,
      class:
        'bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700',
    },
    {
      variant: 'ghost',
      isSelected: true,
      class: 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700',
    },
    {
      variant: 'ghost',
      size: 'sm',
      class: 'p-1.5',
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

export function LinkButton(props: LinkButtonProps) {
  return (
    <RACLink
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
